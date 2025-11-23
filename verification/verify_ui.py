from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock API responses
        # 1. Metadata
        page.route("**/api/metadata", lambda route: route.fulfill(
            status=200,
            body='{"sources":[{"name":"TechCrunch","count":10},{"name":"Verge","count":5}],"keywords":[{"name":"AI","count":8},{"name":"Apple","count":4}]}',
            headers={"Content-Type": "application/json"}
        ))

        # 2. Articles (with pagination)
        # Note: We need to return an object with { articles: [], pagination: {} }
        page.route("**/api/articles?*", lambda route: route.fulfill(
            status=200,
            body='{"articles":[{"id":1,"rss_source":"TechCrunch","title":"AI is taking over","summary":"This is a very long summary that should ideally be truncated in the card view because it exceeds the limit we set in the frontend code. We want to verify that the show more button appears or at least it is truncated properly. Let us make it even longer to be sure.","published_at":"2023-10-27T10:00:00Z","article_url":"#","keywords":["AI"]}],"pagination":{"total":20,"page":1,"limit":15,"totalPages":2}}',
            headers={"Content-Type": "application/json"}
        ))

        # 3. Login
        page.route("**/api/admin/login", lambda route: route.fulfill(
            status=200,
            body='{"success":true}',
            headers={"Content-Type": "application/json"}
        ))

        # 4. RSS Sources (Admin)
        page.route("**/api/rss-sources", lambda route: route.fulfill(
            status=200,
            body='[{"id":1,"name":"TechCrunch","url":"https://techcrunch.com/feed","custom_prompt":""}]',
            headers={"Content-Type": "application/json"}
        ))

        try:
            # 1. Verify Main Page
            print("Navigating to Main Page...")
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=TechCrunch") # Wait for metadata to load

            # Check for Pagination controls
            print("Checking Pagination...")
            page.wait_for_selector("text=第 1 页")

            # Check for Date Shortcuts
            print("Checking Date Shortcuts...")
            page.wait_for_selector("text=近3日")

            page.screenshot(path="verification/main_page.png", full_page=True)
            print("Main Page screenshot saved.")

            # 2. Verify Admin Page (Login)
            print("Navigating to Admin Page...")
            page.goto("http://localhost:3000/admin")
            page.wait_for_selector("text=管理员登录")
            page.screenshot(path="verification/admin_login.png")
            print("Admin Login screenshot saved.")

            # 3. Verify Admin Dashboard
            print("Logging in...")
            # Fill login form
            page.fill("input[type=text]", "admin")
            page.fill("input[type=password]", "password")
            page.click("button[type=submit]")

            # Wait for dashboard
            page.wait_for_selector("text=RSS 管理后台")
            page.wait_for_selector("text=订阅源管理")
            page.wait_for_selector("text=TechCrunch") # Data from mocked API

            page.screenshot(path="verification/admin_dashboard.png", full_page=True)
            print("Admin Dashboard screenshot saved.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
