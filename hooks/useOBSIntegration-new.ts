import { useState } from 'react';
import { OBSConfig } from '@/types/streaming';
import { STREAMING_CONSTANTS } from '@/constants/streaming';

export function useOBSIntegration() {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedPath, setDetectedPath] = useState<string>('');

  const openOBS = async (obsPath: string, config?: Partial<OBSConfig>): Promise<boolean> => {
    try {
      setIsOpening(true);
      setError(null);

      // If obsPath is 'auto', try to auto-detect
      const actualObsPath = obsPath === 'auto' ? detectedPath || await detectObsPath() : obsPath;

      const response = await fetch('/api/obs/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          obsPath: actualObsPath,
          server: config?.server,
          streamKey: config?.stream_key,
          config: config
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to launch OBS');
      }

      const data = await response.json();
      console.log('OBS launched successfully:', data);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open OBS';
      setError(errorMessage);
      console.error('OBS launch error:', err);
      return false;
    } finally {
      setIsOpening(false);
    }
  };

  const detectObsPath = async (): Promise<string> => {
    try {
      // Call API to detect OBS installation
      const response = await fetch('/api/obs/launch');
      if (!response.ok) {
        throw new Error('Failed to detect OBS');
      }

      const data = await response.json();
      const recommendedPath = data.recommendedPath || data.existingPaths?.[0] || '';
      
      setDetectedPath(recommendedPath);
      return recommendedPath;

    } catch (err) {
      console.error('Failed to detect OBS path:', err);
      // Fallback to platform detection
      const platform = navigator.platform.toLowerCase();
      
      if (platform.includes('win')) {
        const path = 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe';
        setDetectedPath(path);
        return path;
      } else if (platform.includes('mac')) {
        const path = '/Applications/OBS.app/Contents/MacOS/OBS';
        setDetectedPath(path);
        return path;
      } else if (platform.includes('linux')) {
        const path = '/usr/bin/obs';
        setDetectedPath(path);
        return path;
      }
      
      return '';
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text:', err);
      return false;
    }
  };

  const generateOBSUrl = (server: string, streamKey: string): string => {
    // Generate a URL that can be used to configure OBS
    // This is NOT for opening OBS, but for reference
    return `obs://configure?server=${encodeURIComponent(server)}&key=${encodeURIComponent(streamKey)}`;
  };

  const validateOBSPath = (path: string): { valid: boolean; error?: string } => {
    if (!path || path.trim().length === 0) {
      return { valid: false, error: 'OBS path is required' };
    }

    // Basic validation based on platform
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      if (!path.toLowerCase().includes('.exe')) {
        return { valid: false, error: 'Windows path must end with .exe' };
      }
      if (!path.toLowerCase().includes('obs')) {
        return { valid: false, error: 'Path must point to OBS executable' };
      }
    } else if (platform.includes('mac')) {
      if (!path.toLowerCase().includes('obs')) {
        return { valid: false, error: 'Path must point to OBS application' };
      }
    }

    return { valid: true };
  };

  const getOBSDownloadUrl = (): string => {
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('win')) {
      return 'https://obsproject.com/download';
    } else if (platform.includes('mac')) {
      return 'https://obsproject.com/download';
    } else if (platform.includes('linux')) {
      return 'https://obsproject.com/download';
    }
    
    return 'https://obsproject.com/download';
  };

  return {
    openOBS,
    detectObsPath,
    copyToClipboard,
    generateOBSUrl,
    validateOBSPath,
    getOBSDownloadUrl,
    isOpening,
    error,
    detectedPath
  };
}
