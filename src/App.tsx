import { Component, lazy } from "solid-js";
import { Route, Routes } from "solid-app-router";
import CssBaseline from "@suid/material/CssBaseline";

const Login = lazy(() => import("./pages/Login"));
const User = lazy(() => import("./pages/User"));
const Index = lazy(() => import("./pages/Index"));

const App: Component = () => {
    return (<>
        <CssBaseline />
        <Routes>
            <Route path="/" element={<Index />}/>
            <Route path="/login" element={<Login />} />
            <Route path="/user" element={<User />} />
        </Routes>
    </>);
};

export default App;
