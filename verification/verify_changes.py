from playwright.sync_api import sync_playwright
import json

def verify_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock API responses
        def handle_metadata(route):
            print(f"Mocking metadata for {route.request.url}")
            route.fulfill(json={
                "sources": [{"name": "Mock Source", "count": 10}],
                "keywords": [{"name": "AI", "count": 5}]
            })

        def handle_articles(route):
            print(f"Mocking articles for {route.request.url}")
            route.fulfill(json={
                "articles": [
                    {
                        "id": 1,
                        "title": "Test Article",
                        "summary": "This is a test summary",
                        "published_at": "2023-10-27T10:00:00Z",
                        "rss_source": "Mock Source",
                        "keywords": ["AI"],
                        "article_url": "http://example.com"
                    }
                ],
                "pagination": {
                    "total": 1,
                    "page": 1,
                    "limit": 15,
                    "totalPages": 1
                }
            })

        def handle_sources(route):
             print(f"Mocking sources for {route.request.url}")
             route.fulfill(json=[
                 {"id": 1, "name": "Test Source", "url": "http://test.com", "custom_prompt": ""}
             ])

        def handle_session(route):
            route.fulfill(json={"authenticated": True})

        page.route("**/api/metadata*", handle_metadata)
        page.route("**/api/articles*", handle_articles)
        page.route("**/api/rss-sources*", handle_sources)
        page.route("**/api/admin/check-session", handle_session)

        print("Navigating to home...")
        try:
            page.goto("http://localhost:3000/")
            page.wait_for_timeout(3000) # Wait for redirect
        except:
            page.goto("http://localhost:3001/")
            page.wait_for_timeout(3000)

        print(f"Current URL: {page.url}")

        # Check Sidebar Links
        print("Checking Sidebar...")
        news_link = page.get_by_role("link", name="新闻资讯")
        paper_link = page.get_by_role("link", name="学术论文")

        if news_link.count() > 0:
            print("News link found")
        else:
            print("News link NOT found")

        if paper_link.count() > 0:
            print("Paper link found")
        else:
            print("Paper link NOT found")

        page.screenshot(path="verification/news_page.png")

        # Navigate to Paper
        if paper_link.count() > 0:
            print("Clicking Paper link...")
            paper_link.click()
            page.wait_for_timeout(2000)
            print(f"Current URL after click: {page.url}")
            if "paper" in page.url:
                print("Successfully navigated to /paper")
            else:
                 print("Failed to navigate to /paper")
            page.screenshot(path="verification/paper_page.png")

        # Navigate to Admin
        print("Navigating to Admin...")
        page.goto("http://localhost:3000/admin")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/admin_dashboard.png")

        # Check Admin Tabs
        print("Checking Admin Tabs...")
        news_tab = page.get_by_role("button", name="新闻资讯")
        paper_tab = page.get_by_role("button", name="学术论文")

        if news_tab.count() > 0 and paper_tab.count() > 0:
            print("Admin tabs found")
            paper_tab.click()
            page.wait_for_timeout(500)
            page.screenshot(path="verification/admin_paper_tab.png")

            # Check Add Button Text
            add_btn = page.get_by_role("button", name="新增学术源")
            if add_btn.count() > 0:
                print("Add button text updated correctly for Paper tab")
            else:
                print("Add button text NOT updated")

        else:
            print("Admin tabs NOT found")

        browser.close()

if __name__ == "__main__":
    verify_feature()
