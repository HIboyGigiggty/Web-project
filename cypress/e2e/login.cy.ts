
describe("the login page", () => {
    before(() => {
        cy.resetDb();
    });

    beforeEach(() => {
        cy.resetLogin();
    });

    it("can jump to index if we have been sign in", () => {
        cy.login("TEST_USER_1");
        cy.visit("/login");
        cy.once("url:changed", (url) => {
            assert.equal(new URL(url).pathname, "/");
        });
    });

    describe("password flow", () => {
        beforeEach(() => {
            cy.resetLogin();
            cy.visit("/login");
        });

        it("can sign in by email and password", () => {
            cy.get("#login-with-password").click();
            cy.get("input:first").type("example1@example.org");
            cy.get("input:last").type("testing-purpose-only");
            cy.get("#sign-in-with-password-button").click().then(
                () => cy.once("url:changed", (url) => {
                    assert.equal(new URL(url).pathname, "/");
                })
            );
        });
    
        it("will show not found notice when email or password is wrong", () => {
            cy.get("#login-with-password").click();
            cy.get("input:first").type("example1@example.org");
            cy.get("input:last").type("wrong-password");
            cy.get("#sign-in-with-password-button").click();
            cy.get(".MuiFormHelperText-root").within(() => {
                cy.get("p").should("exist");
            });
        });
    });
});
