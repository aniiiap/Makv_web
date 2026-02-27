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
    const [activeTask, setActiveTask] = useState(null); // The task object being timed
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState(null);
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
                    setStartTime(parsedState.startTime);

                    // Calculate elapsed time correctly if it was running
                    if (parsedState.isRunning && parsedState.startTime) {
                        const now = Date.now();
                        const additionalElapsed = Math.floor((now - parsedState.lastTick) / 1000);
                        setElapsedTime(parsedState.elapsedTime + additionalElapsed);
                    } else {
                        setElapsedTime(parsedState.elapsedTime);
                    }
                }
            } catch (error) {
                console.error('Failed to load timer state:', error);
            }
        }
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        const stateToSave = {
            activeTask,
            isRunning,
            startTime,
            elapsedTime,
            lastTick: Date.now()
        };
        localStorage.setItem('taskManager_timerState', JSON.stringify(stateToSave));
    }, [activeTask, isRunning, startTime, elapsedTime]);

    // Timer tick logic
    useEffect(() => {
        if (isRunning) {
            timerIntervalRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
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
    }, [isRunning]);

    const startTimer = (task) => {
        // If another task is already running, stop it first or warn
        if (activeTask && activeTask._id !== task._id) {
            // Optional: Auto-stop previous task or ask confirmation. 
            // For now, let's just switch to new task.
            stopTimer();
        }

        if (!activeTask || activeTask._id !== task._id) {
            setActiveTask(task);
            setElapsedTime(0);
            setStartTime(Date.now());
        }

        setIsRunning(true);
        toast.success(`Timer started: ${task.title}`);
    };

    const stopTimer = () => {
        setIsRunning(false);
        setActiveTask(null);
        setElapsedTime(0);
        setStartTime(null);
        localStorage.removeItem('taskManager_timerState');
    };

    const clearTimer = () => {
        stopTimer();
        setActiveTask(null);
        setElapsedTime(0);
        setStartTime(null);
        localStorage.removeItem('taskManager_timerState');
    };

    const syncTimer = (task, timerData) => {
        if (!timerData || !timerData.startTime) return;

        setActiveTask(task);
        setIsRunning(true);
        setStartTime(timerData.startTime);

        const start = new Date(timerData.startTime).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        setElapsedTime(elapsed >= 0 ? elapsed : 0);
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
            elapsedTime,
            startTimer,
            stopTimer,
            clearTimer,
            syncTimer,
            formatTime
        }}>
            {children}
        </TimerContext.Provider>
    );
};
