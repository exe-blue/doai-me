import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase-client'; // Assuming a client setup file

interface Props {
    deviceSerial: string;
    nodeId: string;
}

export default function DeviceScreenshotManager({ deviceSerial, nodeId }: Props) {
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRequesting, setIsRequesting] = useState(false);

    // Function to construct the full public URL for the screenshot
    const getPublicUrl = (path: string) => {
        const { data } = supabase.storage.from('screenshots').getPublicUrl(path);
        return data.publicUrl;
    };

    // Fetch the latest screenshot on component mount
    useEffect(() => {
        async function fetchLatestScreenshot() {
            setIsLoading(true);
            const { data, error } = await supabase.rpc('get_latest_screenshot_url', {
                p_device_serial: deviceSerial,
            });

            if (data) {
                setScreenshotUrl(getPublicUrl(data));
            } else if (error) {
                console.error('Error fetching latest screenshot:', error);
            }
            setIsLoading(false);
        }

        fetchLatestScreenshot();
    }, [deviceSerial]);

    // Handle the screenshot request
    const handleRequestScreenshot = async () => {
        if (isRequesting) return;
        setIsRequesting(true);
        setScreenshotUrl(null); // Clear old screenshot

        // Use a unique key for idempotency
        const idempotencyKey = `screenshot-${deviceSerial}-${Date.now()}`;

        // Create a 'DEVICE_SCREENSHOT' job
        const { data: job, error } = await supabase.rpc('create_job_idempotent', {
            p_idempotency_key: idempotencyKey,
            p_target_node: nodeId,
            p_target_device: deviceSerial,
            p_job_type: 'DEVICE_SCREENSHOT',
            p_priority: 'HIGH',
            p_payload: {},
        });

        if (error || !job || job.length === 0) {
            console.error('Error creating screenshot job:', error);
            setIsRequesting(false);
            return;
        }

        const newJobId = job[0].job_id;

        // Subscribe to changes for this specific job
        const channel = supabase
            .channel(`job-updates-${newJobId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'job_queue', filter: `job_id=eq.${newJobId}` },
                (payload) => {
                    const updatedJob = payload.new as { status: string; result: { url: string } };
                    if (updatedJob.status === 'COMPLETED' && updatedJob.result?.url) {
                        setScreenshotUrl(getPublicUrl(updatedJob.result.url));
                        setIsRequesting(false);
                        channel.unsubscribe();
                    } else if (updatedJob.status === 'FAILED' || updatedJob.status === 'TIMEOUT') {
                        console.error('Screenshot job failed.');
                        setIsRequesting(false);
                        channel.unsubscribe();
                    }
                }
            )
            .subscribe();
        
        // Timeout for the request
        setTimeout(() => {
            if (isRequesting) {
                setIsRequesting(false);
                channel.unsubscribe();
                console.warn('Screenshot request timed out.');
            }
        }, 30000); // 30 second timeout
    };

    return (
        <div className="bg-room-800 p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-mono text-gray-300">Device: {deviceSerial}</h3>
                <button onClick={handleRequestScreenshot} disabled={isRequesting} className="px-4 py-2 bg-doai-500 text-white font-semibold rounded-md hover:bg-doai-400 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                    {isRequesting ? 'Capturing...' : 'Request Screenshot'}
                </button>
            </div>
            <div className="w-full aspect-[9/16] bg-room-900 rounded flex items-center justify-center overflow-hidden">
                {isLoading || isRequesting ? (
                    <div className="text-gray-400 animate-pulse">Loading Screenshot...</div>
                ) : screenshotUrl ? (
                    <img src={screenshotUrl} alt={`Screenshot of ${deviceSerial}`} className="w-full h-full object-contain" />
                ) : (
                    <div className="text-gray-500">No Screenshot Available</div>
                )}
            </div>
        </div>
    );
}