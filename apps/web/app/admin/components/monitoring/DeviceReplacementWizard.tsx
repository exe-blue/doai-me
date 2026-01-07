'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DeviceData } from './DeviceGridV2';

// ============================================
// Types
// ============================================

type WizardStep = 'identify' | 'verify' | 'restore' | 'complete';

interface AgentInfo {
  agent_id: string;
  google_email: string;
  display_name: string;
  binding_status: string;
  last_state_backup_at: string | null;
}

interface DeviceReplacementWizardProps {
  device: DeviceData | null;
  onClose: () => void;
  onComplete?: () => void;
}

// ============================================
// DeviceReplacementWizard Component
// ============================================

export function DeviceReplacementWizard({
  device,
  onClose,
  onComplete,
}: DeviceReplacementWizardProps) {
  const [step, setStep] = useState<WizardStep>('identify');
  const [newSerial, setNewSerial] = useState('');
  const [newImei, setNewImei] = useState('');
  const [confirmPhysical, setConfirmPhysical] = useState(false);
  const [confirmAgent, setConfirmAgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!device) return null;

  const displayIndex = String(device.device_index).padStart(3, '0');
  const hasAgent = device.agent_id !== null;

  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: 'identify', label: 'Identify' },
    { id: 'verify', label: 'Verify' },
    { id: 'restore', label: 'Restore' },
    { id: 'complete', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  // Step Navigation
  const goToStep = (targetStep: WizardStep) => {
    setError(null);
    setStep(targetStep);
  };

  // API Calls
  const handleReplace = async () => {
    if (!newSerial.trim()) {
      setError('New ADB Serial is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/monitoring/${device.device_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace',
          newSerial: newSerial.trim(),
          newImei: newImei.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to replace device';
        throw new Error(errorMessage);
      }

      // If agent exists, restore binding
      if (hasAgent) {
        goToStep('restore');
      } else {
        setResult({ success: true, message: 'Device replaced successfully' });
        goToStep('complete');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBinding = async () => {
    if (!device.agent_id) {
      goToStep('complete');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/monitoring/${device.device_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore-binding',
          agentId: device.agent_id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to restore agent binding';
        throw new Error(`Restore binding failed: ${errorMessage}`);
      }

      setResult({ success: true, message: 'Device replaced and agent binding restored' });
      goToStep('complete');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete?.();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-[#0a0d12] border border-neutral-700 rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-amber-950/20">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="text-neutral-200 font-mono">
                DEVICE REPLACEMENT WIZARD
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Progress */}
          <div className="px-4 py-3 border-b border-neutral-800">
            <div className="text-sm text-neutral-400 mb-2">
              Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].label}
            </div>
            <div className="flex items-center gap-2">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      i < currentStepIndex
                        ? 'bg-emerald-500'
                        : i === currentStepIndex
                        ? 'bg-amber-500'
                        : 'bg-neutral-700'
                    }`}
                  />
                  {i < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 ${
                        i < currentStepIndex ? 'bg-emerald-500' : 'bg-neutral-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-950 border border-red-900 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Identify */}
            {step === 'identify' && (
              <StepIdentify
                device={device}
                displayIndex={displayIndex}
                onNext={() => goToStep('verify')}
              />
            )}

            {/* Step 2: Verify */}
            {step === 'verify' && (
              <StepVerify
                device={device}
                displayIndex={displayIndex}
                newSerial={newSerial}
                setNewSerial={setNewSerial}
                newImei={newImei}
                setNewImei={setNewImei}
                confirmPhysical={confirmPhysical}
                setConfirmPhysical={setConfirmPhysical}
                confirmAgent={confirmAgent}
                setConfirmAgent={setConfirmAgent}
                hasAgent={hasAgent}
                onBack={() => goToStep('identify')}
                onNext={handleReplace}
                isLoading={isLoading}
              />
            )}

            {/* Step 3: Restore */}
            {step === 'restore' && (
              <StepRestore
                device={device}
                onNext={handleRestoreBinding}
                isLoading={isLoading}
              />
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <StepComplete
                result={result}
                onClose={handleComplete}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// Step Components
// ============================================

function StepIdentify({
  device,
  displayIndex,
  onNext,
}: {
  device: DeviceData;
  displayIndex: string;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-neutral-300">
        The following device has been marked as <span className="text-red-400 font-bold">FAULTY</span>.
        Please confirm the device details before proceeding with replacement.
      </div>

      <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg">
        <div className="text-xs text-neutral-500 mb-2 tracking-wider">FAULTY DEVICE</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-neutral-500">Device ID:</span>
            <span className="text-neutral-200 ml-2">#{displayIndex}</span>
          </div>
          <div>
            <span className="text-neutral-500">Serial:</span>
            <span className="text-neutral-200 ml-2 font-mono">{device.device_serial}</span>
          </div>
          <div>
            <span className="text-neutral-500">Model:</span>
            <span className="text-neutral-200 ml-2">{device.model_name}</span>
          </div>
          <div>
            <span className="text-neutral-500">IMEI:</span>
            <span className="text-neutral-200 ml-2 font-mono">{device.manufacturer_serial || 'N/A'}</span>
          </div>
          <div>
            <span className="text-neutral-500">Location:</span>
            <span className="text-neutral-200 ml-2">{device.runner_hostname} / Slot #{device.slot_number}</span>
          </div>
          {device.agent_id && (
            <div>
              <span className="text-neutral-500">Agent:</span>
              <span className="text-neutral-200 ml-2">{device.google_email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
        >
          Proceed to Verification →
        </button>
      </div>
    </div>
  );
}

function StepVerify({
  device,
  displayIndex,
  newSerial,
  setNewSerial,
  newImei,
  setNewImei,
  confirmPhysical,
  setConfirmPhysical,
  confirmAgent,
  setConfirmAgent,
  hasAgent,
  onBack,
  onNext,
  isLoading,
}: {
  device: DeviceData;
  displayIndex: string;
  newSerial: string;
  setNewSerial: (v: string) => void;
  newImei: string;
  setNewImei: (v: string) => void;
  confirmPhysical: boolean;
  setConfirmPhysical: (v: boolean) => void;
  confirmAgent: boolean;
  setConfirmAgent: (v: boolean) => void;
  hasAgent: boolean;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
}) {
  const canProceed = newSerial.trim() && confirmPhysical && (!hasAgent || confirmAgent);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Faulty Device */}
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-500 mb-2">FAULTY DEVICE</div>
          <div className="space-y-1 text-sm">
            <div className="text-neutral-200 font-mono">{device.device_serial}</div>
            <div className="text-neutral-400">{device.model_name}</div>
            <div className="text-neutral-500 text-xs">{device.manufacturer_serial}</div>
            <div className="text-neutral-500 text-xs">{device.runner_hostname} / #{device.slot_number}</div>
            {device.agent_id && (
              <div className="text-amber-400 text-xs">{device.google_email}</div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <span className="text-2xl text-neutral-600">→</span>
        </div>

        {/* New Device */}
        <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg col-start-2 row-start-1">
          <div className="text-xs text-neutral-500 mb-2">NEW DEVICE</div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="ADB Serial (required)"
              value={newSerial}
              onChange={(e) => setNewSerial(e.target.value)}
              className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 text-sm font-mono focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="IMEI (optional)"
              value={newImei}
              onChange={(e) => setNewImei(e.target.value)}
              className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 text-sm font-mono focus:outline-none focus:border-emerald-500"
            />
            <div className="text-neutral-500 text-xs">Slot #{device.slot_number}</div>
            {hasAgent && (
              <div className="text-amber-400 text-xs">(to be bound)</div>
            )}
          </div>
        </div>
      </div>

      {/* Warning */}
      {hasAgent && (
        <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-amber-400 text-sm">
          ⚠️ <strong>IMPORTANT:</strong> The AI Agent "{device.agent_name}" will be migrated
          to the new device. All backed up data will be restored.
        </div>
      )}

      {/* Confirmations */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmPhysical}
            onChange={(e) => setConfirmPhysical(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500"
          />
          I confirm the new device is physically installed in slot #{device.slot_number}
        </label>
        {hasAgent && (
          <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmAgent}
              onChange={(e) => setConfirmAgent(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500"
            />
            I understand the agent will be re-bound to this device
          </label>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed || isLoading}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Proceed to Restore →'}
        </button>
      </div>
    </div>
  );
}

function StepRestore({
  device,
  onNext,
  isLoading,
}: {
  device: DeviceData;
  onNext: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-neutral-300">
        Device has been replaced. Now restoring AI Agent binding and data.
      </div>

      <div className="p-4 bg-purple-950/20 border border-purple-900/50 rounded-lg">
        <div className="text-xs text-neutral-500 mb-2 tracking-wider">AGENT RESTORATION</div>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-neutral-500">Google Account:</span>
            <span className="text-neutral-200 ml-2">{device.google_email}</span>
          </div>
          <div>
            <span className="text-neutral-500">Agent Name:</span>
            <span className="text-neutral-200 ml-2">{device.agent_name}</span>
          </div>
          <div>
            <span className="text-neutral-500">Status:</span>
            <span className={`ml-2 ${isLoading ? 'text-amber-400' : 'text-neutral-300'}`}>
              {isLoading ? 'Migrating...' : 'Pending restoration'}
            </span>
          </div>
        </div>
      </div>

      <div className="text-neutral-500 text-sm">
        <p>The following will be restored:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Agent binding to new device</li>
          <li>Persona configuration</li>
          <li>Last state backup</li>
        </ul>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Restoring...' : 'Restore Agent Binding'}
        </button>
      </div>
    </div>
  );
}

function StepComplete({
  result,
  onClose,
}: {
  result: { success: boolean; message: string } | null;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      {result?.success ? (
        <>
          <div className="text-5xl">✅</div>
          <div className="text-xl text-emerald-400 font-bold">
            Replacement Complete
          </div>
          <div className="text-neutral-400">
            {result.message}
          </div>
        </>
      ) : (
        <>
          <div className="text-5xl">❌</div>
          <div className="text-xl text-red-400 font-bold">
            Replacement Failed
          </div>
          <div className="text-neutral-400">
            {result?.message || 'An error occurred during replacement'}
          </div>
        </>
      )}

      <div className="pt-4">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
        >
          Close Wizard
        </button>
      </div>
    </div>
  );
}


