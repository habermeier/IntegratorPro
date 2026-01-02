/**
 * Device Conversion Modal
 * AUTO-SPEC-SYSTEM-P26: Mass conversion modal & logic
 *
 * Presents options for batch-updating device types when a user saves a device
 * with a different type than the original. Offers scoped conversion:
 * - Only this instance
 * - All devices of old type in current room
 * - All devices of old type in entire project
 */

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface DeviceConversionOption {
  scope: 'instance' | 'room' | 'project';
  label: string;
  description: string;
  count: number; // Number of devices that will be affected
}

export interface DeviceConversionModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;

  /** Device instance ID being edited */
  deviceId: string;

  /** Old device type ID (before change) */
  oldTypeId: string;

  /** Old device type name (for display) */
  oldTypeName: string;

  /** New device type ID (after change) */
  newTypeId: string;

  /** New device type name (for display) */
  newTypeName: string;

  /** Current room ID (if device is in a room) */
  roomId: string | null;

  /** Current room name (for display) */
  roomName: string | null;

  /** Total count of devices with old type in current room */
  countInRoom: number;

  /** Total count of devices with old type in entire project */
  countInProject: number;

  /** Callback when user selects an option */
  onConfirm: (scope: 'instance' | 'room' | 'project') => void;

  /** Callback when user cancels */
  onCancel: () => void;
}

export const DeviceConversionModal: React.FC<DeviceConversionModalProps> = ({
  isOpen,
  deviceId,
  oldTypeId,
  oldTypeName,
  newTypeId,
  newTypeName,
  roomId,
  roomName,
  countInRoom,
  countInProject,
  onConfirm,
  onCancel
}) => {
  const [selectedOption, setSelectedOption] = React.useState<'instance' | 'room' | 'project'>('instance');

  if (!isOpen) return null;

  const options: DeviceConversionOption[] = [
    {
      scope: 'instance',
      label: 'Only this instance',
      description: 'Update only this single device',
      count: 1
    },
    {
      scope: 'room',
      label: `All "${oldTypeName}" in ${roomName || 'current room'}`,
      description: `Update ${countInRoom} device${countInRoom !== 1 ? 's' : ''} in this room`,
      count: countInRoom
    },
    {
      scope: 'project',
      label: `All "${oldTypeName}" in Project`,
      description: `Update ${countInProject} device${countInProject !== 1 ? 's' : ''} across entire project`,
      count: countInProject
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-slate-900/95 backdrop-blur-md border-2 border-blue-500/30 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-6 max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="conversion-modal-title"
        aria-describedby="conversion-modal-description"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <AlertCircle className="text-blue-400" size={24} />
            </div>
            <div>
              <h3 id="conversion-modal-title" className="text-lg font-bold text-white">
                Device Type Change Detected
              </h3>
              <p id="conversion-modal-description" className="text-sm text-slate-400 mt-1">
                Converting from <span className="text-blue-400 font-semibold">{oldTypeName}</span> to{' '}
                <span className="text-emerald-400 font-semibold">{newTypeName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-white focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors p-1"
            aria-label="Close conversion modal"
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {options.map((option) => (
            <button
              key={option.scope}
              onClick={() => setSelectedOption(option.scope)}
              disabled={option.scope === 'room' && !roomId}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedOption === option.scope
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/80'
              } ${option.scope === 'room' && !roomId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-pressed={selectedOption === option.scope}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {selectedOption === option.scope && (
                      <CheckCircle className="text-blue-400" size={18} />
                    )}
                    <span className="font-semibold text-white">{option.label}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{option.description}</p>
                  {option.scope === 'room' && !roomId && (
                    <p className="text-xs text-amber-400 mt-1">Device not assigned to a room</p>
                  )}
                </div>
                <div className="ml-4">
                  <span className="text-xs font-bold text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
                    {option.count}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedOption)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
            aria-label={`Apply changes to ${selectedOption}`}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
