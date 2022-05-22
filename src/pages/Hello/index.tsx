import type { Component } from "solid-js";

const Hello: Component = () => {
    return (<>
        <h1 class="center">Longlive Bravo Tango 7274!</h1>
        <style jsx>{`
            .center {
                margin: auto;
                width: 50%;
                text-align: center;
            }
        `}</style>
    </>);
};

export default Hello;
