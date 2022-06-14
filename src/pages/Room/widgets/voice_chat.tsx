import IconButton from "@suid/material/IconButton";
import { Component } from "solid-js";

interface VoiceChatIconButtonProps {
    alive: boolean,
    onClick: ((ev: MouseEvent) => void),
}

export const VoiceChatIconButton: Component<VoiceChatIconButtonProps> = (props) => {
    return <>
        <IconButton
            onClick={(e) => props.onClick(e)}
        >
            <svg classList={{"fade-in-out": props.alive}} style="max-width: 14px; max-height: 14px; margin: 8px;" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="50" fill={props.alive? "#c21408": "#000000"}/>
            </svg>
        </IconButton>
        <style jsx>{
            `
            @keyframes fade-in-out {
                from {
                    opacity: 0%;
                }
            
                50% {
                    opacity: 100%;
                }
            
                to {
                    opacity : 0%;
                }
            }

            .fade-in-out {
                animation-name: fade-in-out;
                animation-duration: 2s;
                animation-iteration-count: infinite;
            }
            `
        }</style>
    </>;
};
