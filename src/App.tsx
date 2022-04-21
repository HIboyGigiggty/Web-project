import { Component, lazy } from "solid-js";
import { Route, Routes } from "solid-app-router";
import CssBaseline from "@suid/material/CssBaseline";

const Hello = lazy(() => import("./pages/Hello"));

const App: Component = () => {
    return (<>
        <CssBaseline />
        <Routes>
            <Route path="/" element={<Hello />}/>
        </Routes>
    </>)
};

export default App;
