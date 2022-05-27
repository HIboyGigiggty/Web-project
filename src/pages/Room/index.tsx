import { useParams } from "solid-app-router";
import { Component } from "solid-js";

const Room: Component = () => {
    const params = useParams();
    return <>
        <span>Room for {params.id}</span>
    </>;
};

export default Room;
