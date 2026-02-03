# JMeter Performance Testing for Tasker Application

This guide explains how to set up and run performance tests for the Tasker application using Apache JMeter.

## Prerequisites

1. **Install Apache JMeter**
   - Download from: https://jmeter.apache.org/download_jmeter.cgi
   - Extract the archive to a directory of your choice
   - Make sure Java 8 or higher is installed on your system

2. **Start the Tasker Application**
   - Ensure both the backend and frontend are running
   - Backend should be accessible at `http://localhost:5000` (default)
   - You may need to adjust the port in the JMeter test plan if using a different port

## Running the Performance Tests

### Method 1: Using JMeter GUI

1. Navigate to your JMeter installation directory
2. Run JMeter:
   - Windows: `bin/jmeter.bat`
   - Linux/Mac: `bin/jmeter.sh`
3. In JMeter, open the test plan: `tasker-performance-test.jmx`
4. Modify the thread group settings if needed:
   - Right-click on "Tasker Users" → Edit
   - Adjust "Number of Threads (users)" and "Ramp-up period"
5. Update the login credentials if needed:
   - Add JMeter properties or modify the login sampler
6. Click the green "Play" button to start the test
7. Monitor the results in the listeners (Results Tree, Summary Report, etc.)

### Method 2: Command Line Interface (CLI)

Run the test from the command line:

```bash
# Navigate to JMeter bin directory
cd /path/to/jmeter/bin

# Run the test plan
jmeter -n -t /path/to/tasker-performance-test.jmx -l results.jtl -j jmeter.log

# Generate HTML report
jmeter -g results.jtl -o /path/to/report-folder
```

Parameters:
- `-n`: Non-GUI mode
- `-t`: Path to the test plan file
- `-l`: Path to save the results file
- `-j`: Path to save the JMeter log file
- `-g`: Generate report from results file
- `-o`: Output directory for the HTML report

## Test Plan Overview

The JMeter test plan includes the following elements:

### Thread Group
- Simulates multiple concurrent users
- Default: 10 users ramped up over 5 seconds

### HTTP Request Defaults
- Sets the base URL to `http://localhost:5000/api`
- Configures connection and response timeouts

### Test Scenarios
1. **Login User**: Authenticates with the application
2. **Get User Profile**: Retrieves user profile information
3. **Get Tasks**: Fetches user's tasks
4. **Create Task**: Creates a new task
5. **Get Categories**: Fetches task categories
6. **Get Events**: Fetches user's events
7. **Random Timer**: Adds delays between requests to simulate realistic user behavior

### Listeners
- **View Results Tree**: Detailed view of individual requests/responses
- **Summary Report**: Aggregated statistics
- **Aggregate Report**: Performance metrics summary

## Customizing the Test

### Changing Server Details
1. Right-click on "HTTP Request Defaults" → Edit
2. Modify the domain, port, or protocol as needed

### Updating Credentials
Use JMeter properties to pass login credentials:
```bash
jmeter -n -t tasker-performance-test.jmx -Jlogin.email=user@example.com -Jlogin.password=password -l results.jtl
```

Or modify the login sampler directly in the GUI.

### Adjusting Load Parameters
1. Edit the "Tasker Users" thread group
2. Change:
   - Number of threads (concurrent users)
   - Ramp-up period (time to start all users)
   - Loop count (how many times to repeat the test scenario)

## Key Metrics to Monitor

- **Response Time**: How long each request takes
- **Throughput**: Requests per second the system can handle
- **Error Rate**: Percentage of failed requests
- **Concurrency**: How the system behaves under different load levels

## Performance Testing Best Practices

1. **Start Small**: Begin with a low number of users and gradually increase
2. **Monitor Resources**: Keep an eye on CPU, memory, and disk usage on both client and server
3. **Warm-up Period**: Allow the application to warm up before measuring performance
4. **Multiple Runs**: Execute tests multiple times to ensure consistency
5. **Environment Consistency**: Run tests in a consistent environment
6. **Baseline Comparison**: Compare results against baseline measurements

## Troubleshooting

### Common Issues
- **Connection Refused**: Ensure the Tasker backend is running
- **Authentication Failures**: Verify login credentials are correct
- **Timeout Errors**: Increase timeout values in HTTP Request Defaults
- **Memory Issues**: Increase heap size for JMeter: `JMETER_OPTS="-Xms1024m -Xmx2048m"`

### Useful JMeter Properties
- `jmeter.save.saveservice.output_format=csv` - Save results in CSV format
- `jmeter.save.saveservice.response_data=true` - Include response data in results
- `mode=Stripped` - Run with minimal overhead

## Sample Test Scenarios

### Smoke Test (Low Load)
- 1-5 users
- 1 iteration
- Purpose: Verify basic functionality under light load

### Load Test (Expected Load)
- 10-50 users
- Multiple iterations
- Purpose: Validate performance under expected load

### Stress Test (High Load)
- Gradually increase users until failure
- Purpose: Determine breaking point

### Soak Test (Extended Duration)
- Moderate load for extended period (hours/days)
- Purpose: Identify memory leaks or degradation over time