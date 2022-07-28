import { useLocation } from "solid-app-router";
import { Component, Match, Switch } from "solid-js";


interface ErrorPageProps {
    httpErrCode: number
}


const ErrorPage: Component<ErrorPageProps> = (p) => {
    const location = useLocation();

    return <>
        <style>{`
            ins {
                color: #777;
                text-decoration: none;
            }

            p {
                margin: 11px 0 22px;
                overflow: hidden;
            }

            * {
                margin: 0;
                padding: 0;
            }

            #app {
                background: #fff;
                color: #222;
                padding: 15px;
            }

            div {
                padding-right: 205px;
                margin: 7% auto 0;
                max-width: 390px;
                min-height: 180px;
                padding: 30px 0 15px;
            }

            @media screen and (max-width: 772px) {
                div {
                    margin-top: 0;
                    max-width: none;
                    padding-right: 0;
                }
            }
        `}</style>
        <div>
            <p><b>{p.httpErrCode}.</b><ins>That's an error.</ins></p>
            <Switch fallback={
                <p>
                    This code does not have explain from us. <ins>That's all we know.</ins>
                </p>
            }>
                <Match when={p.httpErrCode === 404}>
                    <p>
                        The requested link <code>{location.pathname}</code> was not found on this website.
                        <ins>That's all we know.</ins>
                    </p>
                </Match>
            </Switch>
        </div>
    </>;
};

export default ErrorPage;
