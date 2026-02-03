# PowerShell script to run JMeter performance tests for Tasker application

param(
    [Parameter(Mandatory=$false)]
    [string]$JMeterHome = "",

    [Parameter(Mandatory=$false)]
    [string]$TestPlan = "tasker-performance-test.jmx",

    [Parameter(Mandatory=$false)]
    [string]$ResultsFile = "results.jtl",

    [Parameter(Mandatory=$false)]
    [string]$LogFile = "jmeter.log",

    [Parameter(Mandatory=$false)]
    [string]$ReportDir = "jmeter-report",

    [Parameter(Mandatory=$false)]
    [int]$NumThreads = 10,

    [Parameter(Mandatory=$false)]
    [int]$RampUp = 5,

    [Parameter(Mandatory=$false)]
    [int]$Duration = 60
)

# Function to display usage
function Show-Usage {
    Write-Host "Usage: .\run-jmeter-tests.ps1 [OPTIONS]"
    Write-Host "Options:"
    Write-Host "  -JMeterHome    Path to JMeter installation directory"
    Write-Host "  -TestPlan      JMeter test plan file (default: $TestPlan)"
    Write-Host "  -ResultsFile   Results file (default: $ResultsFile)"
    Write-Host "  -LogFile       Log file (default: $LogFile)"
    Write-Host "  -ReportDir     Report output directory (default: $ReportDir)"
    Write-Host "  -NumThreads    Number of threads/users (default: $NumThreads)"
    Write-Host "  -RampUp        Ramp-up period in seconds (default: $RampUp)"
    Write-Host "  -Duration      Test duration in seconds (default: $Duration)"
    Write-Host ""
    Write-Host "Example:"
    Write-Host "  .\run-jmeter-tests.ps1 -JMeterHome 'C:\apache-jmeter-5.6.3' -NumThreads 20 -Duration 120"
    exit 1
}

# Validate JMeter home directory
if ([string]::IsNullOrEmpty($JMeterHome)) {
    Write-Host "Error: JMeter home directory not specified." -ForegroundColor Red
    Write-Host "Please provide the path to your JMeter installation using -JMeterHome parameter." -ForegroundColor Red
    Write-Host "Example: .\run-jmeter-tests.ps1 -JMeterHome 'C:\apache-jmeter-5.6.3'" -ForegroundColor Yellow
    exit 1
}

if (!(Test-Path $JMeterHome)) {
    Write-Host "Error: JMeter home directory does not exist: $JMeterHome" -ForegroundColor Red
    exit 1
}

# Validate test plan file
if (!(Test-Path $TestPlan)) {
    Write-Host "Error: Test plan file does not exist: $TestPlan" -ForegroundColor Red
    exit 1
}

# Set JMeter executable path
$JMeterCmd = Join-Path $JMeterHome "bin\jmeter.bat"

if (!(Test-Path $JMeterCmd)) {
    Write-Host "Error: JMeter executable not found: $JMeterCmd" -ForegroundColor Red
    exit 1
}

Write-Host "Starting JMeter performance test..." -ForegroundColor Green
Write-Host "JMeter Home: $JMeterHome"
Write-Host "Test Plan: $TestPlan"
Write-Host "Threads: $NumThreads"
Write-Host "Ramp-up: $RampUp seconds"
Write-Host "Duration: $Duration seconds"
Write-Host "Results File: $ResultsFile"
Write-Host "Log File: $LogFile"
Write-Host ""

# Run the JMeter test
Write-Host "Running performance test..." -ForegroundColor Cyan
$arguments = @(
    "-n",
    "-t", "`"$TestPlan`"",
    "-l", "`"$ResultsFile`"",
    "-j", "`"$LogFile`"",
    "-JTHREADS=$NumThreads",
    "-JRAMPUP=$RampUp",
    "-JDURATION=$Duration",
    "-Dsun.net.http.allowRestrictedHeaders=true",
    "-Dhttp.keepAlive=false"
)

$result = Start-Process -FilePath $JMeterCmd -ArgumentList $arguments -Wait -PassThru

if ($result.ExitCode -eq 0) {
    Write-Host ""
    Write-Host "Test completed successfully!" -ForegroundColor Green
    Write-Host "Results saved to: $ResultsFile"
    Write-Host "Log saved to: $LogFile"
    
    # Generate HTML report
    Write-Host ""
    Write-Host "Generating HTML report..." -ForegroundColor Cyan
    $reportArgs = @("-g", "`"$ResultsFile`"", "-o", "`"$ReportDir`"")
    $reportResult = Start-Process -FilePath $JMeterCmd -ArgumentList $reportArgs -Wait -PassThru
    
    if ($reportResult.ExitCode -eq 0) {
        Write-Host "HTML report generated in: $ReportDir" -ForegroundColor Green
        Write-Host "Open $ReportDir\index.html in your browser to view the report" -ForegroundColor Green
    } else {
        Write-Host "Failed to generate HTML report" -ForegroundColor Red
    }
} else {
    Write-Host "Test failed! Check the log file: $LogFile" -ForegroundColor Red
    exit 1
}