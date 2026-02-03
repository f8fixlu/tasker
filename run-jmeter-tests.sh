#!/bin/bash
# Script to run JMeter performance tests for Tasker application

# Default values
JMETER_HOME=""
TEST_PLAN="tasker-performance-test.jmx"
RESULTS_FILE="results.jtl"
LOG_FILE="jmeter.log"
REPORT_DIR="jmeter-report"
NUM_THREADS=10
RAMP_UP=5
DURATION=60

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -j, --jmeter-home PATH    Path to JMeter installation directory"
    echo "  -t, --test-plan FILE      JMeter test plan file (default: $TEST_PLAN)"
    echo "  -r, --results FILE        Results file (default: $RESULTS_FILE)"
    echo "  -l, --log FILE            Log file (default: $LOG_FILE)"
    echo "  -d, --report-dir DIR      Report output directory (default: $REPORT_DIR)"
    echo "  -n, --num-threads NUM     Number of threads/users (default: $NUM_THREADS)"
    echo "  -u, --ramp-up SEC         Ramp-up period in seconds (default: $RAMP_UP)"
    echo "  -e, --duration SEC        Test duration in seconds (default: $DURATION)"
    echo "  -h, --help                Display this help message"
    echo ""
    echo "Example:"
    echo "  $0 -j /opt/apache-jmeter-5.6.3 -n 20 -e 120"
    exit 1
}

# Parse command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        -j|--jmeter-home)
            JMETER_HOME="$2"
            shift 2
            ;;
        -t|--test-plan)
            TEST_PLAN="$2"
            shift 2
            ;;
        -r|--results)
            RESULTS_FILE="$2"
            shift 2
            ;;
        -l|--log)
            LOG_FILE="$2"
            shift 2
            ;;
        -d|--report-dir)
            REPORT_DIR="$2"
            shift 2
            ;;
        -n|--num-threads)
            NUM_THREADS="$2"
            shift 2
            ;;
        -u|--ramp-up)
            RAMP_UP="$2"
            shift 2
            ;;
        -e|--duration)
            DURATION="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate JMeter home directory
if [ -z "$JMETER_HOME" ]; then
    echo "Error: JMeter home directory not specified."
    echo "Please provide the path to your JMeter installation using -j or --jmeter-home option."
    echo "Example: $0 -j /opt/apache-jmeter-5.6.3"
    exit 1
fi

if [ ! -d "$JMETER_HOME" ]; then
    echo "Error: JMeter home directory does not exist: $JMETER_HOME"
    exit 1
fi

# Validate test plan file
if [ ! -f "$TEST_PLAN" ]; then
    echo "Error: Test plan file does not exist: $TEST_PLAN"
    exit 1
fi

# Set JMeter executable path
JMETER_CMD="$JMETER_HOME/bin/jmeter"

if [ ! -x "$JMETER_CMD" ]; then
    echo "Error: JMeter executable not found or not executable: $JMETER_CMD"
    exit 1
fi

echo "Starting JMeter performance test..."
echo "JMeter Home: $JMETER_HOME"
echo "Test Plan: $TEST_PLAN"
echo "Threads: $NUM_THREADS"
echo "Ramp-up: $RAMP_UP seconds"
echo "Duration: $DURATION seconds"
echo "Results File: $RESULTS_FILE"
echo "Log File: $LOG_FILE"
echo ""

# Run the JMeter test
echo "Running performance test..."
"$JMETER_CMD" -n \
    -t "$TEST_PLAN" \
    -l "$RESULTS_FILE" \
    -j "$LOG_FILE" \
    -JTHREADS="$NUM_THREADS" \
    -JRAMPUP="$RAMP_UP" \
    -JDURATION="$DURATION" \
    -Dsun.net.http.allowRestrictedHeaders=true \
    -Dhttp.keepAlive=false

if [ $? -eq 0 ]; then
    echo ""
    echo "Test completed successfully!"
    echo "Results saved to: $RESULTS_FILE"
    echo "Log saved to: $LOG_FILE"
    
    # Generate HTML report
    echo ""
    echo "Generating HTML report..."
    "$JMETER_CMD" -g "$RESULTS_FILE" -o "$REPORT_DIR"
    
    if [ $? -eq 0 ]; then
        echo "HTML report generated in: $REPORT_DIR"
        echo "Open $REPORT_DIR/index.html in your browser to view the report"
    else
        echo "Failed to generate HTML report"
    fi
else
    echo "Test failed! Check the log file: $LOG_FILE"
    exit 1
fi