import XCTest

final class BilletUITests: XCTestCase {
    func testProfileNavigation() throws {
        let app = launchSignedInApp(initialTab: "profile")
        XCTAssertTrue(app.navigationBars["Hồ sơ"].waitForExistence(timeout: 5))
    }

    func testStatisticsNavigation() throws {
        let app = launchSignedInApp(initialTab: "statistics")
        XCTAssertTrue(app.navigationBars["Thống kê"].waitForExistence(timeout: 5))
    }

    private func launchSignedInApp(initialTab: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.terminate()
        app.launchEnvironment["BILLET_UI_TESTING"] = "1"
        app.launchEnvironment["BILLET_UI_TEST_TAB"] = initialTab
        app.launch()

        let username = app.textFields["Tên đăng nhập, email hoặc số điện thoại"]
        if username.waitForExistence(timeout: 5) {
            username.tap()
            username.typeText("ntdm")
            let password = app.secureTextFields["Mật khẩu"]
            password.tap()
            password.typeText("devt")
            app.buttons["Đăng nhập"].tap()
        }

        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 10))
        let dismissPasswordSave = app.buttons["Not Now"]
        if dismissPasswordSave.waitForExistence(timeout: 1) { dismissPasswordSave.tap() }
        return app
    }
}
