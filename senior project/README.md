# Group Schedule Matching Algorithm (Algorithm 2)

## Overview
This C++ program solves the group schedule matching problem by finding common available time slots between multiple group members for scheduling meetings. The algorithm takes into account each member's busy periods and daily availability windows to identify optimal meeting times.

## Problem Definition
Given:
- Multiple group members' schedules (busy time intervals)
- Each member's daily active period (earliest and latest available times)
- Desired meeting duration

Find: All time intervals where all members are available for at least the specified meeting duration.

## Algorithm Approach

### 1. Time Representation
- All times are converted from HH:MM format to minutes since 00:00 for easier arithmetic
- Example: "9:30" becomes 570 minutes (9 × 60 + 30)

### 2. Common Active Period Calculation
```cpp
int common_start = max(person1_start, person2_start);
int common_end = min(person1_end, person2_end);
```
The algorithm finds the intersection of all members' daily active periods to ensure meetings are scheduled only when everyone is potentially available.

### 3. Busy Period Aggregation
- Collects all busy intervals from all group members
- Adds periods outside the common active window as "busy" (since members aren't available then)
- Merges overlapping busy intervals to create a consolidated unavailability schedule

### 4. Interval Merging Logic
```cpp
vector<TimeInterval> mergeIntervals(vector<TimeInterval>& intervals) {
    sort(intervals.begin(), intervals.end(), [](const TimeInterval& a, const TimeInterval& b) {
        return a.start < b.start;
    });
    
    // Merge overlapping intervals
    for (int i = 1; i < intervals.size(); i++) {
        if (intervals[i].start <= merged.back().end) {
            merged.back().end = max(merged.back().end, intervals[i].end);
        } else {
            merged.push_back(intervals[i]);
        }
    }
}
```

### 5. Gap Detection
The algorithm identifies three types of potential meeting slots:
1. **Before first busy period**: From common start time to first busy interval
2. **Between busy periods**: Gaps between consecutive merged busy intervals
3. **After last busy period**: From last busy interval to common end time

### 6. Duration Filtering
Only gaps that are at least as long as the required meeting duration are included in the final results.

## Code Structure

### Key Functions

#### `timeToMinutes(const string& time)`
Converts time string (HH:MM) to minutes from midnight.

#### `minutesToTime(int minutes)`
Converts minutes back to HH:MM format for output.

#### `mergeIntervals(vector<TimeInterval>& intervals)`
Sorts and merges overlapping time intervals to eliminate redundancy.

#### `findAvailableTimes(...)`
Main algorithm that:
1. Calculates common active period
2. Aggregates all busy times
3. Merges overlapping busy periods
4. Finds gaps of sufficient duration
5. Returns available meeting slots

### Data Structures

#### `TimeInterval`
```cpp
struct TimeInterval {
    int start;  // time in minutes from 00:00
    int end;    // time in minutes from 00:00
};
```

## Sample Input/Output

### Input:
```cpp
person1_Schedule = [["7:00", "8:30"], ["12:00", "13:00"], ["16:00", "18:00"]]
person1_DailyAct = ["9:00", "19:00"]
person2_Schedule = [["9:00", "10:30"], ["12:20", "14:00"], ["14:30", "15:00"], ["16:00", "17:00"]]
person2_DailyAct = ["9:00", "18:30"]
duration_of_meeting = 30
```

### Output:
```
[['10:30', '12:00'], ['14:00', '14:30'], ['15:00', '16:00'], ['18:00', '18:30']]
```

## Time Complexity
- **Sorting**: O(n log n) where n is the total number of busy intervals
- **Merging**: O(n) for merging overlapping intervals
- **Gap Finding**: O(n) for identifying available slots
- **Overall**: O(n log n)

## Space Complexity
- O(n) for storing intervals and results

## How to Compile and Run

```bash
# Compile the program
g++ -o Algo2 Algo2.cpp

# Run the program
./Algo2
```

## Algorithm Walkthrough (Sample Data)

1. **Input Processing**:
   - Person1 active: 9:00-19:00 (540-1140 minutes)
   - Person2 active: 9:00-18:30 (540-1110 minutes)
   - Common active period: 9:00-18:30 (540-1110 minutes)

2. **Busy Periods Collection**:
   - Person1: [420-510], [720-780], [960-1080]
   - Person2: [540-630], [740-840], [870-900], [960-1020]
   - Outside common period: [0-540], [1110-1440]

3. **After Merging**:
   - [0-540], [540-630], [720-840], [870-900], [960-1080], [1110-1440]

4. **Gap Detection**:
   - Gap 1: 630-720 (90 min) → "10:30"-"12:00"
   - Gap 2: 840-870 (30 min) → "14:00"-"14:30"
   - Gap 3: 900-960 (60 min) → "15:00"-"16:00"
   - Gap 4: 1080-1110 (30 min) → "18:00"-"18:30"

## Extensions

The algorithm can be easily extended to handle:
- More than two people (add additional schedule parameters)
- Different meeting durations
- Multiple meeting sessions
- Priority-based scheduling
- Time zone considerations

## Error Handling

The current implementation assumes:
- Valid time format (HH:MM)
- Logical time intervals (start < end)
- Non-negative meeting duration
- At least some overlap in daily active periods

For production use, additional validation should be added for these assumptions.
