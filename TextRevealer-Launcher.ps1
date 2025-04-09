# All-in-one launcher for Text Revealer Node.js application
# This script creates its own desktop shortcut and runs silently

param(
    [string]$AppPath = "C:\Code\text-revealer",
    [string]$BrowserName = "chrome",
    [int]$Port = 3000,
    [int]$StartupDelay = 3,
    [switch]$CreateShortcut = $false,
    [switch]$RunHidden = $false
)

# Function to log messages to a file
function Write-Log {
    param([string]$message)

    $logFile = "$env:TEMP\TextRevealerLauncher.log"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $message" | Out-File -FilePath $logFile -Append
}

# If we need to create a shortcut or it doesn't exist
if ($CreateShortcut -or (-not (Test-Path "$env:USERPROFILE\Desktop\Text Revealer.lnk"))) {
    # Get the full path of this script
    $scriptPath = $MyInvocation.MyCommand.Path

    # Create VBScript to handle the hidden launch
    $vbsPath = "$env:TEMP\LaunchTextRevealer.vbs"
    $vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -NoProfile -File ""$scriptPath"" -RunHidden", 0, False
"@
    $vbsContent | Out-File -FilePath $vbsPath -Encoding ASCII

    # Create shortcut to the VBS file
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Text Revealer.lnk")
    $Shortcut.TargetPath = "wscript.exe"
    $Shortcut.Arguments = "`"$vbsPath`""
    $Shortcut.IconLocation = "powershell.exe,0"
    $Shortcut.Save()

    Write-Log "Shortcut created successfully at $env:USERPROFILE\Desktop\Text Revealer.lnk"
}

# If run as hidden and not already handling a hidden session, exit as our work is done
# The VBS script will launch the real process
if (-not $RunHidden) {
    exit
}

# Real processing starts here for hidden mode
Write-Log "Starting application in hidden mode"

# Check if app directory exists
if (-not (Test-Path $AppPath)) {
    Write-Log "Error: Application directory '$AppPath' does not exist."
    exit
}

# Function to check if localhost is responding on the specified port
function Test-LocalhostPort {
    param([int]$Port)

    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connection = $tcp.BeginConnect("localhost", $Port, $null, $null)
        $wait = $connection.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait) {
            $tcp.EndConnect($connection)
            $tcp.Close()
            return $true
        }
        else {
            $tcp.Close()
            return $false
        }
    }
    catch {
        return $false
    }
}

# Start the Node.js application silently
try {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "cmd.exe"
    $startInfo.Arguments = "/c cd /d $AppPath && npm run dev"
    $startInfo.WorkingDirectory = $AppPath
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $nodeProcess = [System.Diagnostics.Process]::Start($startInfo)

    Write-Log "Node.js process started with ID: $($nodeProcess.Id)"

    # Wait for the application to initialize
    Write-Log "Waiting $StartupDelay seconds for the application to initialize..."
    Start-Sleep -Seconds $StartupDelay
}
catch {
    Write-Log "Error starting Node.js application: $_"
    exit
}

# Verify that the application is actually running
$retries = 0
$maxRetries = 10
$serverRunning = $false

while (-not $serverRunning -and $retries -lt $maxRetries) {
    $serverRunning = Test-LocalhostPort -Port $Port
    if (-not $serverRunning) {
        $retries++
        Write-Log "Waiting for server to become available (attempt $retries of $maxRetries)..."
        Start-Sleep -Seconds 1
    }
}

if (-not $serverRunning) {
    Write-Log "Error: Server did not start on localhost:$Port after $maxRetries attempts."
    # Try to clean up
    if ($nodeProcess -ne $null) {
        try { $nodeProcess.Kill() } catch { }
    }
    exit
}

# Record browser processes before launching new one
try {
    $browserProcessesBefore = @(Get-Process -Name $BrowserName -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    Write-Log "Existing browser processes: $($browserProcessesBefore.Count)"
}
catch {
    $browserProcessesBefore = @()
    Write-Log "Could not get initial browser processes: $_"
}

# Launch browser directly using ShellExecute for more reliable operation
Write-Log "Opening browser to http://localhost:$Port..."
try {
    # Use .NET process start with ShellExecute to open the default browser
    $browserStartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $browserStartInfo.FileName = "http://localhost:$Port"
    $browserStartInfo.UseShellExecute = $true

    [System.Diagnostics.Process]::Start($browserStartInfo)
    Write-Log "Browser launch initiated"
    Start-Sleep -Seconds 2
}
catch {
    Write-Log "Error opening browser: $_"
    # Try to clean up
    if ($nodeProcess -ne $null) {
        try { $nodeProcess.Kill() } catch { }
    }
    exit
}

# Find new browser processes
try {
    $browserProcessesAfter = @(Get-Process -Name $BrowserName -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
    $newBrowserProcesses = @($browserProcessesAfter | Where-Object { $browserProcessesBefore -notcontains $_ })

    Write-Log "New browser processes detected: $($newBrowserProcesses.Count)"
    if ($newBrowserProcesses.Count -gt 0) {
        Write-Log "Will monitor these processes: $($newBrowserProcesses -join ', ')"
    }
    else {
        Write-Log "No new browser processes detected. Will monitor all $BrowserName processes."
        $newBrowserProcesses = $browserProcessesAfter
    }
}
catch {
    Write-Log "Error detecting browser processes: $_"
    $newBrowserProcesses = @()
}

# Monitor for browser closing
try {
    $browserClosed = $false
    $checkCount = 0

    while (-not $browserClosed) {
        Start-Sleep -Seconds 3
        $checkCount++

        # Log every 10 checks (30 seconds) that we're still monitoring
        if ($checkCount % 10 -eq 0) {
            Write-Log "Still monitoring. Node.js process: $($nodeProcess.Id) is running: $(-not $nodeProcess.HasExited)"
        }

        # Check if original Node.js process is still running
        if ($nodeProcess.HasExited) {
            Write-Log "Node.js process has terminated. Exiting monitor..."
            $browserClosed = $true
            continue
        }

        # Check if the browser processes we're monitoring are still running
        if ($newBrowserProcesses.Count -gt 0) {
            $activeProcesses = @(Get-Process -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

            # Check if any of our monitored processes are still running
            $allClosed = $true
            foreach ($procId in $newBrowserProcesses) {
                if ($activeProcesses -contains $procId) {
                    $allClosed = $false
                    break
                }
            }

            if ($allClosed) {
                $browserClosed = $true
                Write-Log "Browser closed. Preparing to shut down the Node.js server..."
            }
        }
        else {
            # If we couldn't track specific processes, check if any browser of that type is running
            $anyBrowser = Get-Process -Name $BrowserName -ErrorAction SilentlyContinue
            if ($null -eq $anyBrowser -or $anyBrowser.Count -eq 0) {
                $browserClosed = $true
                Write-Log "No $BrowserName processes detected. Preparing to shut down the Node.js server..."
            }
        }
    }
}
catch {
    Write-Log "Error during monitoring: $_"
}

# Clean up - terminate the Node.js process
Write-Log "Shutting down Node.js server..."
try {
    # Try to gracefully stop the process we started
    if (-not $nodeProcess.HasExited) {
        $nodeProcess.Kill()
        Write-Log "Terminated main Node.js process: $($nodeProcess.Id)"
    }

    # Find and kill any other related Node.js processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $cmdLine = $null
            try {
                $cmdLine = (Get-WmiObject -Class Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            } catch {}

            if ($null -ne $cmdLine -and $cmdLine -like "*$AppPath*") {
                Write-Log "Terminating additional Node.js process: $($_.Id)"
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            }
        }
        catch {}
    }
}
catch {
    Write-Log "Error shutting down Node.js: $_"
}

Write-Log "Shutdown complete."
