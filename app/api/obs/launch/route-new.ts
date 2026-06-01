import { NextRequest, NextResponse } from 'next/server';
import { validateOBSLaunchRequest } from '@/lib/validation/streaming-new';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { obsPath, server, streamKey, config } = validateOBSLaunchRequest(body);

    // Validate OBS executable exists
    const normalizedPath = path.normalize(obsPath);
    
    try {
      await fs.access(normalizedPath, fs.constants.F_OK);
    } catch (error) {
      return NextResponse.json(
        { error: `OBS executable not found at: ${obsPath}` },
        { status: 400 }
      );
    }

    // Create OBS configuration file (optional)
    let configPath = null;
    if (config) {
      const obsConfig = {
        version: '1.0',
        settings: {
          'Stream.Type': 'rtmp_common',
          'Stream.Service': 'Custom',
          'Stream.Server': server,
          'Stream.Key': streamKey,
          'Stream.Encoder': config.bitrate ? 'x264' : 'default',
          'Stream.VideoBitrate': config.bitrate || 2500,
          'Stream.AudioBitrate': 128,
          'Stream.FPS': config.fps || 30,
          'Stream.Preset': 'veryfast',
          'Stream.Profile': 'main',
          'Stream.KeyframeInt': 60,
          ...(config.resolution && {
            'Output.BaseWidth': config.resolution.width,
            'Output.BaseHeight': config.resolution.height,
            'Video.BaseWidth': config.resolution.width,
            'Video.BaseHeight': config.resolution.height
          })
        }
      };

      // Create config file in temp directory
      const tempDir = path.join(process.env.TEMP || '/tmp', 'obs-configs');
      await fs.mkdir(tempDir, { recursive: true });
      
      configPath = path.join(tempDir, `stream-${Date.now()}.json`);
      await fs.writeFile(configPath, JSON.stringify(obsConfig, null, 2));
    }

    // Launch OBS with configuration
    const obsArgs = configPath ? ['--profile', 'streaming', '--scene-collection', 'streaming'] : [];
    
    const obsProcess = spawn(normalizedPath, obsArgs, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    return new Promise<NextResponse>((resolve) => {
      let launched = false;
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!launched) {
          obsProcess.kill();
        }
      };

      obsProcess.on('spawn', () => {
        launched = true;
        console.log('OBS launched successfully:', normalizedPath);
        
        resolve(NextResponse.json({ 
          success: true, 
          message: 'OBS launched successfully',
          processId: obsProcess.pid,
          configPath: configPath
        }));
        cleanup();
      });

      obsProcess.on('error', (error: any) => {
        console.error('Failed to launch OBS:', error);
        cleanup();
        
        let errorMessage = `Failed to launch OBS: ${error.message}`;
        
        // Provide helpful error messages
        if (error.code === 'ENOENT') {
          errorMessage = 'OBS executable not found. Please check the installation path.';
        } else if (error.code === 'EACCES') {
          errorMessage = 'Permission denied. Please run as administrator or check file permissions.';
        } else if (error.code === 'EMFILE') {
          errorMessage = 'Too many open files. Please close other applications and try again.';
        }
        
        resolve(NextResponse.json(
          { error: errorMessage, code: error.code },
          { status: 500 }
        ));
      });

      // Timeout after 10 seconds
      timeoutId = setTimeout(() => {
        if (!launched) {
          console.error('OBS launch timeout');
          obsProcess.kill();
          
          resolve(NextResponse.json(
            { 
              error: 'OBS launch timeout. Please check if OBS is already running or try restarting your computer.',
              code: 'TIMEOUT'
            },
            { status: 408 }
          ));
        }
      }, 10000);

      // Handle process exit
      obsProcess.on('exit', (code, signal) => {
        if (!launched) {
          console.error('OBS exited before launch:', code, signal);
          cleanup();
          
          resolve(NextResponse.json(
            { 
              error: `OBS exited with code ${code || signal}`,
              code: code || signal
            },
            { status: 500 }
          ));
        }
      });
    });

  } catch (error: any) {
    console.error('OBS launch API error:', error);
    
    let errorMessage = 'Failed to launch OBS';
    if (error.message.includes('Validation failed')) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to detect OBS installation
export async function GET(): Promise<NextResponse> {
  const platform = process.platform;
  let possiblePaths: string[] = [];

  switch (platform) {
    case 'win32':
      possiblePaths = [
        'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs32.exe',
        'C:\\Program Files\\obs-studio\\bin\\obs64.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\obs32.exe'
      ];
      break;
    case 'darwin':
      possiblePaths = [
        '/Applications/OBS.app/Contents/MacOS/OBS',
        '/Applications/OBS.app/Contents/MacOS/obs',
        '/usr/local/bin/obs',
        '/opt/homebrew/bin/obs'
      ];
      break;
    case 'linux':
      possiblePaths = [
        '/usr/bin/obs',
        '/usr/local/bin/obs',
        '/snap/bin/obs',
        '/opt/obs/bin/obs'
      ];
      break;
    default:
      return NextResponse.json({
        platform,
        possiblePaths: [],
        message: 'Unsupported platform'
      });
  }

  // Check which paths exist
  const existingPaths = [];
  for (const obsPath of possiblePaths) {
    try {
      await fs.access(obsPath, fs.constants.F_OK);
      existingPaths.push(obsPath);
    } catch (error) {
      // Path doesn't exist, continue
    }
  }

  return NextResponse.json({
    platform,
    possiblePaths,
    existingPaths,
    recommendedPath: existingPaths[0] || possiblePaths[0],
    found: existingPaths.length > 0
  });
}
