import React from 'react';
import { Mic, MicOff } from 'lucide-react';

export const PTTButton = ({ isTalking, startTalking, stopTalking }) => {
    return (
        <div className="ptt-component">
            <div className="ptt-wrapper">
                <button
                    className={`ptt-button ${isTalking ? 'talking' : ''}`}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        startTalking();
                    }}
                    onPointerUp={(e) => {
                        e.preventDefault();
                        stopTalking();
                    }}
                    onPointerLeave={(e) => {
                        e.preventDefault();
                        if (isTalking) stopTalking();
                    }}
                    style={{ touchAction: 'none' }}
                >
                    {isTalking ? (
                        <Mic size={64} color="white" />
                    ) : (
                        <MicOff size={64} color="rgba(255,255,255,0.8)" />
                    )}

                    <span className="button-label">
                        {isTalking ? 'TRANSMITTING' : 'PUSH TO TALK'}
                    </span>
                </button>
            </div>

            <div style={{ textAlign: 'center' }}>
                <p className="hint-text">
                    {isTalking ? 'Release to listen' : 'Hold to speak'}
                </p>
            </div>
        </div>
    );
};
