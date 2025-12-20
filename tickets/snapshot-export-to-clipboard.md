Date: 2025-12-20

Executive Summary
Add a snapshot feature that captures the current floor plan view as a high-definition image and copies it to the system clipboard for easy pasting into external applications (Gemini, ChatGPT, iMessage, etc.). The feature will render the canvas at 4K resolution by default, add an IntegratorPro watermark, and use the Clipboard API on desktop with Share API fallback on mobile devices for optimal cross-platform compatibility.

Scope

In-Scope:
- Snapshot button in top-right toolbar area with camera icon
- Keyboard shortcut: `Ctrl/Cmd + Shift + C`
- High-resolution canvas export (4K default: 3840x2160 or based on aspect ratio)
- Watermark overlay: "IntegratorPro · [Date]" in bottom-right corner
- Desktop: Clipboard API to copy image as PNG blob
- Mobile: Share API (native share sheet) for Save Image, Messages, Mail, etc.
- Fallback: Download PNG file if Clipboard/Share API unsupported
- Toast notification on success: "✓ Image copied to clipboard" or "✓ Ready to share"
- Capture only canvas content (no UI elements: toolbars, sidebars, panels)
- Respect current camera view (zoom, pan) and visible layers only
- Settings page controls: Export Resolution, Include Watermark, Include Scale Ruler, Include Active Measurements
- Support for devicePixelRatio to prevent blurry exports on high-DPI displays
- Loading indicator during render for large exports

Out-of-Scope:
- Video/animation export
- Multi-page PDF export
- Export with UI elements included (toolbars, sidebars)
- Batch export of multiple views
- Cloud storage integration (Google Drive, Dropbox)
- Direct sharing to specific platforms (social media APIs)
- Custom watermark text/logo upload (use fixed "IntegratorPro" branding)
- Export history or snapshot gallery

Deliverables

1. **Snapshot Button UI**
   - Camera icon button in top-right toolbar area
   - Keyboard shortcut handler: `Ctrl/Cmd + Shift + C`
   - Visual feedback on click (button press animation)
   - Loading spinner overlay during high-res rendering

2. **Canvas Export Function**
   - Function to capture Three.js renderer canvas at specified resolution
   - Default: 4K resolution (3840x2160 or maintain aspect ratio)
   - Account for `window.devicePixelRatio` to prevent blur
   - Capture current camera view and visible layers only (no UI)
   - Render to temporary canvas for export without affecting live view

3. **Watermark Rendering**
   - Draw "IntegratorPro · [Date]" in bottom-right corner using Canvas 2D API
   - Styled text: white with semi-transparent dark background, readable font size
   - Optional: Small logo icon if asset available
   - Toggleable via Settings (default: ON)

4. **Clipboard API Integration (Desktop)**
   - Use `navigator.clipboard.write()` with image/png blob
   - Handle permissions gracefully (request if needed)
   - Success toast: "✓ Image copied to clipboard"
   - Fallback to download if API unavailable or permission denied

5. **Share API Integration (Mobile)**
   - Detect mobile platform (iOS Safari, Android Chrome)
   - Use `navigator.share()` with image file
   - Opens native share sheet (Save Image, Messages, Mail, AirDrop, etc.)
   - Success toast: "✓ Ready to share"
   - Fallback to download if Share API unavailable

6. **Download Fallback**
   - Generate PNG blob and trigger download
   - Filename format: `floorplan-YYYY-MM-DD-HHMMSS.png`
   - Used when Clipboard/Share APIs fail or unsupported browser (Firefox, etc.)

7. **Settings Page Integration**
   - New settings under Floorplan category:
     - **Export Resolution:** Dropdown with options (1080p, 4K, 8K) - default: 4K
     - **Include Watermark:** Toggle (default: ON)
     - **Include Scale Ruler:** Toggle - export with scale ruler visible (default: OFF)
     - **Include Active Measurements:** Toggle - export with measurement annotations (default: OFF)
   - Settings persist in localStorage

8. **Toast Notification System**
   - Success message: "✓ Image copied to clipboard" (desktop) or "✓ Ready to share" (mobile)
   - Error message: "⚠️ Clipboard unavailable - image downloaded instead"
   - Fallback message: "⚠️ Download started - [filename].png"
   - Auto-dismiss after 3 seconds

9. **Platform Detection & Strategy**
   - Detect browser capabilities: Clipboard API, Share API support
   - Choose strategy:
     - Desktop Chrome/Edge/Safari: Clipboard API → Download fallback
     - Mobile iOS Safari: Share API → Download fallback
     - Mobile Chrome: Share API → Clipboard API → Download fallback
     - Firefox: Download (primary)
   - Graceful degradation on all platforms

10. **Performance Optimization**
    - Show loading indicator during high-res render
    - Use `requestAnimationFrame` for smooth rendering
    - Limit max resolution on mobile (e.g., cap at 4K to prevent crashes)
    - Restore original renderer size after export
    - Clean up temporary canvases to prevent memory leaks

11. **Testing Across Platforms**
    - Desktop: Chrome, Edge, Safari, Firefox
    - Mobile: iOS Safari, Android Chrome
    - Test clipboard paste into: Gemini.google.com, ChatGPT, Gmail, iMessage, Slack
    - Verify high-DPI displays render correctly (no blur)

12. **Documentation**
    - User-facing: Tooltip on snapshot button explaining feature
    - Developer: Code comments explaining canvas export process
    - Architecture docs: Update with snapshot system details
