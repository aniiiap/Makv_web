import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

const TimerContext = createContext();

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
};

export const TimerProvider = ({ children }) => {
    // Timer state
    const [activeTask, setActiveTask] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [lastResumedAt, setLastResumedAt] = useState(null);
    const [accumulatedTime, setAccumulatedTime] = useState(0); // In seconds
    const [elapsedTime, setElapsedTime] = useState(0); // In seconds

    const timerIntervalRef = useRef(null);

    // Load state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem('taskManager_timerState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                if (parsedState.activeTask) {
                    setActiveTask(parsedState.activeTask);
                    setIsRunning(parsedState.isRunning);
                    setIsPaused(parsedState.isPaused || false);
                    setStartTime(parsedState.startTime);
                    setLastResumedAt(parsedState.lastResumedAt || parsedState.startTime);
                    setAccumulatedTime(parsedState.accumulatedTime || 0);

                    // Initial calculation of elapsed time
                    if (parsedState.isRunning && !parsedState.isPaused && (parsedState.lastResumedAt || parsedState.startTime)) {
                        const now = Date.now();
                        const start = parsedState.lastResumedAt || parsedState.startTime;
                        const additionalElapsed = Math.floor((now - start) / 1000);
                        setElapsedTime((parsedState.accumulatedTime || 0) + (additionalElapsed > 0 ? additionalElapsed : 0));
                    } else {
                        setElapsedTime(parsedState.accumulatedTime || 0);
                    }
                }
            } catch (error) {
                console.error('Failed to load timer state:', error);
            }
        }
    }, []);

    // Save state to localStorage whenever critical state changes
    useEffect(() => {
        if (!activeTask) return;
        const stateToSave = {
            activeTask,
            isRunning,
            isPaused,
            startTime,
            lastResumedAt,
            accumulatedTime,
            lastTick: Date.now()
        };
        localStorage.setItem('taskManager_timerState', JSON.stringify(stateToSave));
    }, [activeTask, isRunning, isPaused, startTime, lastResumedAt, accumulatedTime]);

    // Timer tick logic
    useEffect(() => {
        if (isRunning && !isPaused && (lastResumedAt || startTime)) {
            const start = lastResumedAt || startTime;
            
            // Sync immediately on setup
            const initialNow = Date.now();
            const initialDiff = Math.floor((initialNow - start) / 1000);
            setElapsedTime(accumulatedTime + (initialDiff > 0 ? initialDiff : 0));

            timerIntervalRef.current = setInterval(() => {
                const now = Date.now();
                const diff = Math.floor((now - start) / 1000);
                setElapsedTime(accumulatedTime + (diff > 0 ? diff : 0));
            }, 1000);
        } else {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [isRunning, isPaused, lastResumedAt, startTime, accumulatedTime]);

    const startTimer = (task) => {
        if (activeTask && activeTask._id !== task._id) {
            stopTimer();
        }

        const now = Date.now();
        if (!activeTask || activeTask._id !== task._id) {
            setActiveTask(task);
            setStartTime(now);
            setLastResumedAt(now);
            setAccumulatedTime(0);
            setElapsedTime(0);
        } else {
            // If resuming same task
            setLastResumedAt(now);
        }

        setIsRunning(true);
        setIsPaused(false);
        toast.success(`Timer started: ${task.title}`);
    };

    const stopTimer = () => {
        setIsRunning(false);
        setIsPaused(false);
        setActiveTask(null);
        setElapsedTime(0);
        setStartTime(null);
        setLastResumedAt(null);
        setAccumulatedTime(0);
        localStorage.removeItem('taskManager_timerState');
    };

    const clearTimer = () => {
        stopTimer();
    };

    const pauseLocalTimer = () => {
        if (isRunning && !isPaused) {
            const now = Date.now();
            const start = lastResumedAt || startTime;
            const diff = Math.floor((now - start) / 1000);
            setAccumulatedTime(prev => prev + (diff > 0 ? diff : 0));
            setIsPaused(true);
        }
    };

    const resumeLocalTimer = () => {
        if (isRunning && isPaused) {
            setLastResumedAt(Date.now());
            setIsPaused(false);
        }
    };

    const syncTimer = (task, timerData) => {
        if (!timerData || !timerData.startTime) return;

        setActiveTask(task);
        setIsRunning(true);
        setIsPaused(timerData.isPaused || false);
        setStartTime(new Date(timerData.startTime).getTime());
        setLastResumedAt(timerData.lastResumedAt ? new Date(timerData.lastResumedAt).getTime() : new Date(timerData.startTime).getTime());
        setAccumulatedTime(timerData.accumulatedTime || 0);

        // Initial calculation
        if (timerData.isPaused) {
            setElapsedTime(timerData.accumulatedTime || 0);
        } else {
            const start = new Date(timerData.lastResumedAt || timerData.startTime).getTime();
            const now = Date.now();
            const diff = Math.floor((now - start) / 1000);
            setElapsedTime((timerData.accumulatedTime || 0) + (diff > 0 ? diff : 0));
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <TimerContext.Provider value={{
            activeTask,
            isRunning,
            isPaused,
            elapsedTime,
            startTimer,
            stopTimer,
            clearTimer,
            syncTimer,
            formatTime,
            pauseLocalTimer,
            resumeLocalTimer
        }}>
            {children}
        </TimerContext.Provider>
    );
};
