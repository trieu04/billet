import XCTest

final class BilletUITests: XCTestCase {
    func testLoginAndCoreNavigation() throws {
        let app = XCUIApplication()
        app.launchEnvironment["BILLET_UI_TESTING"] = "1"
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

        XCTAssertTrue(app.navigationBars["Nhật ký"].waitForExistence(timeout: 10))

        app.tabBars.buttons["Thống kê"].tap()
        XCTAssertTrue(app.navigationBars["Thống kê"].waitForExistence(timeout: 5))

        app.tabBars.buttons["Hồ sơ"].tap()
        XCTAssertTrue(app.navigationBars["Hồ sơ"].waitForExistence(timeout: 5))

        app.tabBars.buttons["Journal"].tap()
        app.buttons["Thêm chi tiêu"].tap()
        XCTAssertTrue(app.staticTexts["Thêm chi tiêu"].waitForExistence(timeout: 5))

        app.buttons["Nhập tay"].tap()
        XCTAssertTrue(app.navigationBars["Chỉnh sửa chi tiêu"].waitForExistence(timeout: 5))
        app.buttons["Hủy"].tap()
        XCTAssertTrue(app.buttons["Bỏ khoản chi"].waitForExistence(timeout: 3))
        app.buttons["Bỏ khoản chi"].tap()
        XCTAssertTrue(app.navigationBars["Nhật ký"].waitForExistence(timeout: 5))
    }
}
