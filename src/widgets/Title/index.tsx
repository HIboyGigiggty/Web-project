import { Component, createEffect, onCleanup, onMount } from "solid-js";

const Title: Component<{title: string}> = (props) => {
    let oldTitle: string | undefined;

    onMount(() => {
        oldTitle = document.title;
    });

    createEffect(() => {
        document.title = props.title;
    });

    onCleanup(() => {
        if (typeof oldTitle !== "undefined") {
            document.title = oldTitle;
        }
    });

    return <></>;
};

export default Title;
