
describe("the login page", () => {
    before(() => {
        cy.resetDb();
    });

    it("can jump to index if we have been sign in", () => {
        cy.login("TEST_USER_1");
        cy.visit("/login").then(
            () => cy.once("url:changed", (url) => {
                assert.equal(new URL(url).pathname, "/");
            }));
    });
});
