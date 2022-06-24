describe("the index page", () => {
    describe("the signing out button", () => {
        beforeEach(() => {
            cy.resetLogin();
            cy.login("TEST_USER_1");
            cy.visit("/");
        });
        it("click and jump to the login page", () => {
            cy.get("#user-info-avatar-button").click();
            cy.get("#sign-out-button").click();
            cy.once("url:changed", (url) => {
                assert.equal(new URL(url).pathname, "/login");
            });
        });
        it("whether supabase.auth.token is cleared after clicking", () => {
            cy.get("#user-info-avatar-button").click();
            cy.get("#sign-out-button").click().then(() => {
                assert.isNull(localStorage.getItem("supabase.auth.token"));
            });
        });
    });
});
