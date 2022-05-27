import { Component, lazy } from "solid-js";
import { Route, Routes } from "solid-app-router";
import CssBaseline from "@suid/material/CssBaseline";
import LoginGuard from "./helpers/LoginGuard";

const Login = lazy(() => import("./pages/Login"));
const User = lazy(() => import("./pages/User"));
const Index = lazy(() => import("./pages/Index"));
const Room = lazy(() => import("./pages/Room"));

const DevDrawBroad = lazy(() => import("./pages/DevDrawBroad"));

const App: Component = () => {
    return (<>
        <CssBaseline />
        <Routes>
            <Route path="/"
                element={
                    <LoginGuard fallback="/login">
                        <Index />
                    </LoginGuard>
                }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/user" element={<User />} />
            <Route path="/dev-draw-broad" element={<DevDrawBroad />} />
            <Route path="/rooms/:id" element={<Room />} />
        </Routes>
    </>);
};

export default App;
