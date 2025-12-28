# Scale Bug Postmortem: The Invisible Devices Mystery

**Date**: 2025-12-28
**Severity**: Critical - devices appeared to not persist after refresh
**Time to Resolution**: 2 days
**Root Cause**: Null scale values being converted to 0 by Three.js

---

## The Problem

After placing devices and refreshing the browser, devices appeared to vanish. The issue manifested as:
- Devices would render correctly when first placed
- After browser refresh, devices were "gone" (actually invisible)
- No errors in console
- Data was saving correctly to JSON

## Root Cause Analysis

### The Data Type Mismatch

The application has two representations of devices:

1. **`PlacedSymbol`** (runtime, editor) - used during placement and rendering
   ```typescript
   interface PlacedSymbol {
       scale: number;  // Required property
       // ... other fields
   }
   ```

2. **`Device`** (persistence, storage) - saved to JSON
   ```typescript
   interface Device {
       // NO scale property!
       position: Vector2;
       rotation: number;
       // ... other fields
   }
   ```

### The Failure Chain

1. **Placement**: User places a device
   - Creates `PlacedSymbol` with `scale: 1` (default)
   - Renders correctly as red cube during debug

2. **Save**: Device is persisted
   - Converts `PlacedSymbol` → `Device` (in `AddSymbolCommand.mapToDevice()`)
   - `Device` interface has **no `scale` field**
   - JSON saved with `"scale": null` or field omitted entirely

3. **Load**: Browser refresh loads project
   - Reads `Device` from JSON
   - Converts `Device` → `PlacedSymbol` (in `useApplyProjectData`)
   - `scale` field is `null` or `undefined`

4. **Render**: LayerSystem renders symbols
   ```typescript
   // BEFORE FIX (BROKEN):
   group.scale.set(symbolData.scale, symbolData.scale, 1);
   // When symbolData.scale = null → Three.js converts to 0
   // Result: scale = (0, 0, 1) → INVISIBLE!
   ```

5. **Result**: Devices in scene with scale `(0.00, 0.00, 1.00)` - invisible!

### Why This Was Hard to Debug

1. **No errors thrown** - `null` is silently converted to `0` by Three.js
2. **Data was saving correctly** - checking JSON showed devices were present
3. **Placement worked** - initial render used correct scale during placement
4. **Logs showed "adding devices"** - devices were being added to scene, just invisible
5. **Only visible with deep scene inspection** - needed `window.scene` to see scale values

## The Fix

### Code Changes (LayerSystem.ts)

Added null coalescing operator to default scale to `1`:

```typescript
// BEFORE (3 locations):
group.scale.set(symbolData.scale, symbolData.scale, 1);

// AFTER (3 locations):
const scale = symbolData.scale ?? 1;  // Default to 1 if null/undefined
group.scale.set(scale, scale, 1);
```

**Locations fixed:**
- Line 539-540: Creating new symbols from library
- Line 565-566: Updating cached symbols
- Line 844-846: Coverage circle radius calculations

### Why This Fix Works

The null coalescing operator (`??`) returns the right-hand value when the left-hand value is `null` or `undefined`:
- `null ?? 1` → `1`
- `undefined ?? 1` → `1`
- `0.5 ?? 1` → `0.5` (preserves valid scale values)

---

## Prevention: How to Avoid This in the Future

### 1. **Type Safety at Boundaries**

Add runtime validation when converting between types:

```typescript
// GOOD: Defensive conversion with defaults
function deviceToPlacedSymbol(device: Device): PlacedSymbol {
    return {
        ...device,
        x: device.position?.x ?? 0,
        y: device.position?.y ?? 0,
        scale: 1,  // EXPLICIT DEFAULT - don't rely on undefined
        // ... other fields
    };
}
```

### 2. **Schema Validation**

Add JSON schema validation or Zod schemas:

```typescript
import { z } from 'zod';

const DeviceSchema = z.object({
    id: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    rotation: z.number(),
    // ... all required fields
});

// On load:
const device = DeviceSchema.parse(jsonData);  // Throws if invalid
```

### 3. **Required vs Optional Fields**

Make render-critical fields required with defaults:

```typescript
// BAD:
interface PlacedSymbol {
    scale: number;  // Can be undefined in practice
}

// GOOD:
interface PlacedSymbol {
    scale: number;  // Always has a value
}

// And enforce with default:
const symbol: PlacedSymbol = {
    scale: symbolData.scale ?? 1,  // Never undefined
    // ...
};
```

### 4. **Unit Tests for Conversions**

```typescript
describe('Device to PlacedSymbol conversion', () => {
    it('should default scale to 1 when Device has no scale', () => {
        const device: Device = {
            id: 'test',
            position: { x: 100, y: 200 },
            // No scale field
        };

        const symbol = deviceToPlacedSymbol(device);
        expect(symbol.scale).toBe(1);
    });
});
```

### 5. **Scene Debugging Utilities**

Keep the scene exposure for debugging (already implemented):

```typescript
// In LayerSystem.ts constructor:
(window as any).scene = this.scene;

// Then in console:
window.scene.children.forEach(child => {
    console.log(child.name, child.scale);  // Quick scale check
});
```

### 6. **Logging at Critical Points**

Add validation logs when rendering:

```typescript
if (scale === 0 || scale === null || scale === undefined) {
    console.warn(`⚠️ Invalid scale for symbol ${symbolData.id}: ${scale}`);
}
```

### 7. **TypeScript Strict Null Checks**

Enable in `tsconfig.json`:

```json
{
    "compilerOptions": {
        "strictNullChecks": true,
        "strict": true
    }
}
```

This would have caught:
```typescript
// With strictNullChecks, this would error:
const scale: number = symbolData.scale;  // Error: Type 'number | undefined' not assignable to 'number'

// Forces explicit handling:
const scale: number = symbolData.scale ?? 1;  // OK
```

---

## Lessons Learned

1. **Silent failures are the worst** - No error ≠ working code
2. **Type mismatches at boundaries** - Conversions between data models are risky
3. **Default values matter** - Always provide sensible defaults for critical fields
4. **Deep inspection tools are essential** - Scene dumping to `window.scene` was crucial
5. **Runtime !== Persisted** - Just because it works when placed doesn't mean it works on load

---

## Related Files

- `editor/systems/LayerSystem.ts` - Rendering system (lines 539, 565, 844)
- `editor/models/types.ts` - `PlacedSymbol` interface (has scale)
- `src/models/Device.ts` - `Device` interface (no scale field)
- `src/hooks/useApplyProjectData.ts` - Device → PlacedSymbol conversion
- `editor/commands/AddSymbolCommand.ts` - PlacedSymbol → Device conversion

---

## Checklist for Future Data Model Changes

- [ ] Does the new field exist in both `Device` and `PlacedSymbol`?
- [ ] If not, is there an explicit default during conversion?
- [ ] Are null/undefined values handled defensively?
- [ ] Is the field validated on load?
- [ ] Are there unit tests for the conversion?
- [ ] Does rendering handle missing/null values gracefully?
- [ ] Is strict null checking enabled for the file?
