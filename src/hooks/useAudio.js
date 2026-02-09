import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

// Determine Socket URL: Direct port 3000 to bypass Vite proxy issues in dev
const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3000`;
const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;

export function useAudio() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isTalking, setIsTalking] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [activeUsers, setActiveUsers] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [volume, setVolume] = useState(0);

    const socketRef = useRef(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const nextStartTimeRef = useRef(0);
    const scheduledEndTimeRef = useRef(0);

    const calculateVolume = (buffer) => {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += Math.abs(buffer[i]);
        }
        // Amplify visual calculation
        return Math.min(100, Math.round((sum / buffer.length) * 5000));
    };

    useEffect(() => {
        console.log("Connecting to:", SOCKET_URL);
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        socketRef.current.on('connect', () => {
            setConnectionStatus('connected');
            setErrorMessage('');
        });

        socketRef.current.on('disconnect', () => {
            setConnectionStatus('disconnected');
        });

        socketRef.current.on('connect_error', (err) => {
            console.error("Socket error", err);
            setConnectionStatus('error');
            setErrorMessage(err.message);
        });

        socketRef.current.on('user-list', (usersList) => {
            console.log("Received User List:", usersList);
            setActiveUsers(prev => {
                // Merge talking state
                return usersList.map(u => ({
                    ...u,
                    isTalking: prev.find(p => p.id === u.id)?.isTalking || false
                }));
            });
        });

        socketRef.current.on('ptt-status', (status) => {
            setActiveUsers(prev => prev.map(u =>
                u.id === status.id ? { ...u, isTalking: status.isTalking } : u
            ));
        });

        // PCM Playback
        socketRef.current.on('ptt-stream', async (audioData) => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
            }
            const ctx = audioContextRef.current;

            if (ctx.state === 'suspended') {
                await ctx.resume().catch(e => console.error("Audio resume failed", e));
            }

            try {
                const float32Data = new Float32Array(audioData);
                setVolume(calculateVolume(float32Data));

                const audioBuffer = ctx.createBuffer(1, float32Data.length, SAMPLE_RATE);
                audioBuffer.copyToChannel(float32Data, 0);

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                const now = ctx.currentTime;
                // Latency management
                if (scheduledEndTimeRef.current < now) {
                    scheduledEndTimeRef.current = now + 0.05;
                }

                source.start(scheduledEndTimeRef.current);
                scheduledEndTimeRef.current += audioBuffer.duration;

                setIsPlaying(true);

                // Reset playing state timeout
                setTimeout(() => {
                    if (ctx.currentTime >= scheduledEndTimeRef.current - 0.1) {
                        setIsPlaying(false);
                        setVolume(0);
                    }
                }, audioBuffer.duration * 1000 + 100);

            } catch (e) {
                console.error("Playback error", e);
            }
        });

        return () => {
            socketRef.current.disconnect();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const stopAudioCapture = () => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
    };

    const startTalking = async () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
            }
            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') await ctx.resume();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: SAMPLE_RATE
                }
            });

            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!socketRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                setVolume(calculateVolume(inputData));

                socketRef.current.emit('ptt-stream', inputData.buffer);
            };

            const muteGain = ctx.createGain();
            muteGain.gain.value = 0;

            source.connect(processor);
            processor.connect(muteGain);
            muteGain.connect(ctx.destination);

            setIsTalking(true);
            socketRef.current.emit('ptt-status', { isTalking: true });

        } catch (err) {
            console.error('Error accessing microphone:', err);
            setErrorMessage(err.message);
            alert("Could not access microphone. Ensure HTTPS or localhost.");
        }
    };

    const stopTalking = () => {
        stopAudioCapture();
        setIsTalking(false);
        setVolume(0);
        if (socketRef.current) {
            socketRef.current.emit('ptt-status', { isTalking: false });
        }

        if (sourceRef.current && sourceRef.current.mediaStream) {
            sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
        }
    };

    return {
        startTalking,
        stopTalking,
        isTalking,
        isPlaying,
        connectionStatus,
        activeUsers,
        errorMessage,
        volume,
        socket: socketRef.current // Export socket to get own ID
    };
}
