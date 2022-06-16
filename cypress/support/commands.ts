/* eslint-disable @typescript-eslint/no-namespace */
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add("login", (USER) => {
    cy.task("getCurrentSession", {
        email: Cypress.env(`${USER}_EMAIL`),
        password: Cypress.env(`${USER}_PASSWORD`),
        supabaseApiKey: Cypress.env("SUPABASE_API_KEY"),
        supabaseURL: Cypress.env("SUPABASE_URL"),
    })
        .then((currentSession: Record<string, unknown>) => {
            if (currentSession.expires_at) {
                localStorage.setItem("supabase.auth.token", JSON.stringify({
                    currentSession,
                    expiresAt: currentSession.expires_at,
                }));
            }
        });
});

Cypress.Commands.add("resetDb", () => {
    return cy.exec("supabase db reset")
        .then(subject => {
            if (subject.code !== 0) {
                throw Error(`Database reset failed: \n${subject.stdout}\n${subject.stderr}`);
            }
        });
});

Cypress.Commands.add("resetLogin", () => {
    localStorage.removeItem("supabase.auth.token");
});

declare namespace Cypress {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Chainable {
        login(USER: string): void;
        resetDb(): void;
        resetLogin(): void;
    }
}
