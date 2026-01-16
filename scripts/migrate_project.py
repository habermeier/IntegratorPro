import json
import os

project_path = '/Users/berniehabermeier/IntegratorPro/projects/270-boll-ave/project.json'

if os.path.exists(project_path):
    with open(project_path, 'r') as f:
        data = json.load(f)

    # 1. Clean up devices
    for device in data.get('devices', []):
        # Already handled by sed: bp-he-williams-2ds -> 2DS-L12
        # Now refine based on metadata shorthand
        shorthand = device.get('metadata', {}).get('shorthand')
        if shorthand in ['2DS-L9', '2DS-L12']:
            device['productId'] = shorthand
            # Update name if it's the nasty custom prefix
            if device.get('name', '').startswith('custom-2ds-'):
                device['name'] = shorthand
        
        # Fans
        if device.get('productId') == 'HAIKU-52-ALU' or device.get('deviceTypeId') == 'HAIKU-52-ALU':
            device['name'] = 'Haiku Fan'

    # 2. Clean up custom symbols
    for sym in data.get('customSymbols', []):
        if sym.get('productId') == '2DS-L9' and '2DS-L9' in sym.get('name', ''):
            sym['id'] = 'custom-2ds-l9'
        if sym.get('productId') == 'BAF-HAIKU':
            sym['productId'] = 'HAIKU-52-ALU'

    with open(project_path, 'w') as f:
        json.dump(data, f, indent=2)
    print("Project migration complete.")
else:
    print("Project file not found.")
