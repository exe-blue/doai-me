import { useState } from 'react';
import { supabase } from '../lib/supabase-client';

interface Props {
    deviceSerial: string;
    nodeId: string;
}

export default function DeviceStatusManager({ deviceSerial, nodeId }: Props) {
    const [isRequesting, setIsRequesting] = useState(false);
    const [deviceDetails, setDeviceDetails] = useState<any | null>(null);
    const [showModal, setShowModal] = useState(false);

    const handleCheckStatus = async () => {
        if (isRequesting) return;
        setIsRequesting(true);
        setDeviceDetails(null);

        // Use a unique key for idempotency to prevent duplicate requests
        const idempotencyKey = `status-${deviceSerial}-${Date.now()}`;

        // Create a 'DEVICE_STATUS_CHECK' job
        const { data: job, error } = await supabase.rpc('create_job_idempotent', {
            p_idempotency_key: idempotencyKey,
            p_target_node: nodeId,
            p_target_device: deviceSerial,
            p_job_type: 'DEVICE_STATUS_CHECK',
            p_priority: 'HIGH',
            p_payload: {},
        });

        if (error || !job || job.length === 0) {
            console.error('Error creating status check job:', error);
            setIsRequesting(false);
            return;
        }

        const newJobId = job[0].job_id;

        // Subscribe to changes for this specific job to get real-time updates
        const channel = supabase
            .channel(`job-updates-${newJobId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'job_queue', filter: `job_id=eq.${newJobId}` },
                (payload) => {
                    const updatedJob = payload.new as { status: string; result: any };
                    if (updatedJob.status === 'COMPLETED' && updatedJob.result) {
                        setDeviceDetails(updatedJob.result);
                        setIsRequesting(false);
                        setShowModal(true);
                        channel.unsubscribe();
                    } else if (updatedJob.status === 'FAILED' || updatedJob.status === 'TIMEOUT') {
                        console.error('Status check job failed.');
                        setIsRequesting(false);
                        channel.unsubscribe();
                    }
                }
            )
            .subscribe();
        
        // Timeout for the request (30 seconds)
        setTimeout(() => {
            if (isRequesting) {
                setIsRequesting(false);
                channel.unsubscribe();
                console.warn('Status check request timed out.');
            }
        }, 30000);
    };

    return (
        <>
            <button 
                onClick={handleCheckStatus} 
                disabled={isRequesting}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
                {isRequesting ? (
                    <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking...
                    </span>
                ) : 'Check Status'}
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Device Status: {deviceSerial}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {deviceDetails ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Common Status Indicators */}
                                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                            <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">Battery</span>
                                            <div className="mt-1 flex items-baseline">
                                                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {deviceDetails.batteryLevel ?? deviceDetails.battery ?? 'N/A'}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                            <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">WiFi</span>
                                            <div className="mt-1 flex items-baseline">
                                                <span className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                    {deviceDetails.wifiSsid || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                            <span className="block text-sm font-medium text-gray-500 dark:text-gray-400">Temperature</span>
                                            <div className="mt-1 flex items-baseline">
                                                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {deviceDetails.temperature ? `${deviceDetails.temperature}°C` : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Raw Details</h4>
                                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono">
                                            {JSON.stringify(deviceDetails, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No details available.
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}