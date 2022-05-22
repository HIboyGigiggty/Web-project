import { Signal, createSignal, onMount, onCleanup, Accessor } from "solid-js";

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
    });

    return [size, setSize];
};

export const useDevicePixelRatio = (): Accessor<number> => {
    const [ratio, setRatio] = createSignal<number>(window.devicePixelRatio);

    let currentQueryList: MediaQueryList | undefined;

    const updateRatio = () => {
        setRatio(window.devicePixelRatio);
        if (currentQueryList) {
            currentQueryList.removeEventListener("change", updateRatio);
            currentQueryList = undefined;
        }
        currentQueryList = window.matchMedia(`(resolution: ${ratio}dppx)`);
        currentQueryList.addEventListener("change", updateRatio, {once: true});
    };

    onMount(() => {
        updateRatio();
    });

    onCleanup(() => {
        if (currentQueryList) {
            currentQueryList.removeEventListener("change", updateRatio);
            currentQueryList = undefined;
        }
    });
    
    return ratio;
};
