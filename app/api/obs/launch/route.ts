import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { obsPath, server, streamKey, streamSessionId, products } = body;

    if (!obsPath || !server || !streamKey) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get current user for validation
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get seller data by user_id first; fallback to email if needed
    let seller = null;
    let sellerError = null;

    const { data: sellerById, error: sellerByIdError } = await supabase
      .from('sellers')
      .select('id, user_id, email, restream_stream_key')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sellerById && sellerById.length > 0) {
      seller = sellerById[0];
    }
    sellerError = sellerByIdError;

    if ((!seller || !seller.id) && user.email) {
      const { data: sellerByEmail, error: sellerByEmailError } = await supabase
        .from('sellers')
        .select('id, user_id, email, restream_stream_key')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      seller = sellerByEmail && sellerByEmail.length > 0 ? sellerByEmail[0] : null;
      sellerError = sellerByEmailError;
    }

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 403 });
    }

    // Validate stream key matches seller's key
    if (seller.restream_stream_key && seller.restream_stream_key !== streamKey) {
      return NextResponse.json({ error: 'Invalid stream key' }, { status: 403 });
    }

    console.log(`Launching OBS for user ${user.id} with stream session ${streamSessionId}`);

    // Launch OBS with proper arguments
    const { spawn } = require('child_process');
    
    return new Promise<NextResponse>((resolve) => {
      const obsArgs = [
        '--profile', 'streaming',
        '--scene-collection', 'tiktok-shop'
      ];

      const obsProcess = spawn(obsPath, obsArgs, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });

      let launched = false;

      obsProcess.on('spawn', () => {
        launched = true;
        console.log('OBS launched successfully:', obsPath);
        
        // Update stream session with OBS launch info
        if (streamSessionId) {
          supabase
            .from('stream_sessions')
            .update({
              metadata: {
                obs_launched: true,
                obs_launched_at: new Date().toISOString(),
                obs_path: obsPath,
                products_in_stream: products || []
              }
            })
            .eq('id', streamSessionId)
            .then(() => {
              console.log('Stream session updated with OBS launch info');
            })
            .catch((err) => {
              console.error('Failed to update stream session:', err);
            });
        }
        
        resolve(NextResponse.json({ 
          success: true, 
          message: 'OBS launched successfully',
          processId: obsProcess.pid,
          nextSteps: [
            'OBS is now open on your computer',
            'Configure stream settings if needed',
            'Click "Start Streaming" in OBS',
            'Your stream will go live automatically'
          ]
        }));
      });

      obsProcess.on('error', (error: any) => {
        console.error('Failed to launch OBS:', error);
        
        let errorMessage = `Failed to launch OBS: ${error.message}`;
        
        // Provide helpful error messages
        if (error.code === 'ENOENT') {
          errorMessage = 'OBS not found. Please install OBS Studio first.';
        } else if (error.code === 'EACCES') {
          errorMessage = 'Permission denied. Please run as administrator.';
        } else if (error.code === 'EMFILE') {
          errorMessage = 'Too many programs open. Please close other apps.';
        }
        
        resolve(NextResponse.json(
          { error: errorMessage, code: error.code },
          { status: 500 }
        ));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!launched) {
          console.error('OBS launch timeout');
          obsProcess.kill();
          
          resolve(NextResponse.json(
            { 
              error: 'OBS took too long to start. Please check if OBS is already running.',
              code: 'TIMEOUT'
            },
            { status: 408 }
          ));
        }
      }, 10000);

      obsProcess.on('exit', (code, signal) => {
        if (!launched) {
          console.error('OBS exited before launch:', code, signal);
          
          resolve(NextResponse.json(
            { 
              error: `OBS closed immediately (code: ${code || signal})`,
              code: code || signal
            },
            { status: 500 }
          ));
        }
      });
    });

  } catch (error: any) {
    console.error('OBS launch API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to launch OBS' },
      { status: 500 }
    );
  }
}

// GET endpoint to detect OBS installation
export async function GET(): Promise<NextResponse> {
  const platform = process.platform;
  let possiblePaths: string[] = [];
  let installCommand = '';

  switch (platform) {
    case 'win32':
      possiblePaths = [
        'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\32bit\\obs32.exe',
        'C:\\Program Files\\obs-studio\\bin\\obs64.exe',
        'C:\\Program Files (x86)\\obs-studio\\bin\\obs32.exe'
      ];
      installCommand = 'Download from: https://obsproject.com/download';
      break;
    case 'darwin':
      possiblePaths = [
        '/Applications/OBS.app/Contents/MacOS/OBS',
        '/Applications/OBS.app/Contents/MacOS/obs',
        '/usr/local/bin/obs'
      ];
      installCommand = 'Install with: brew install --cask obs';
      break;
    case 'linux':
      possiblePaths = [
        '/usr/bin/obs',
        '/usr/local/bin/obs',
        '/snap/bin/obs'
      ];
      installCommand = 'Install with: sudo apt install obs-studio';
      break;
    default:
      return NextResponse.json({
        platform,
        possiblePaths: [],
        installCommand: 'Visit https://obsproject.com/download',
        message: 'Unsupported platform'
      });
  }

  // Check which paths exist (simplified check)
  const existingPaths = possiblePaths.filter(path => {
    try {
      require('fs').accessSync(path, require('fs').constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  });

  return NextResponse.json({
    platform,
    possiblePaths,
    existingPaths,
    recommendedPath: existingPaths[0] || possiblePaths[0],
    installCommand,
    found: existingPaths.length > 0,
    downloadUrl: 'https://obsproject.com/download'
  });
}
