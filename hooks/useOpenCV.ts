import { useState, useEffect } from 'react';

// Define the cv type globally or use any for now as opencv.js types are complex
declare global {
    interface Window {
        cv: any;
    }
}

export const useOpenCV = () => {
    const [loaded, setLoaded] = useState(false);
    const [cv, setCv] = useState<any>(null);

    useEffect(() => {
        if (window.cv) {
            setLoaded(true);
            setCv(window.cv);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
        script.async = true;
        script.onload = () => {
            // opencv.js loads async, we need to wait for the runtime to be initialized
            if (window.cv && window.cv.getBuildInformation) { // Simple check
                setLoaded(true);
                setCv(window.cv);
            } else {
                // Fallback polling if it's not immediately ready after onload
                const checkCv = setInterval(() => {
                    if (window.cv && window.cv.getBuildInformation) {
                        clearInterval(checkCv);
                        setLoaded(true);
                        setCv(window.cv);
                    }
                }, 100);
            }
        };
        document.body.appendChild(script);

        return () => {
            // Cleanup if needed, though usually we keep the script
        };
    }, []);

    return { loaded, cv };
};
