import { Signal, createSignal, onMount, onCleanup } from "solid-js";

export const useWindowSize = (): Signal<{width: number, height: number}> => {
    const [size, setSize] = createSignal<{width: number, height: number}>({
        width: window.innerHeight * window.devicePixelRatio,
        height: window.innerWidth * window.devicePixelRatio,
    });
    const onResize = () => {
        const height = window.innerHeight * window.devicePixelRatio;
        const width = window.innerWidth * window.devicePixelRatio;
        setSize({width, height});
    };

    onMount(() => {
        onResize();
        window.addEventListener("resize", onResize);
    });

    onCleanup(() => {
        window.removeEventListener("resize", onResize);
    })

    return [size, setSize];
}
