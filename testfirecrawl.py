import os
import requests

def get_total_urls_firecrawl(api_key, domain):
    url = "https://api.firecrawl.dev/v1/map"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    data = {
        "url": domain,
        "search": ""
    }

    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        links = response.json().get('links', [])
        print(f"Số lượng URL Firecrawl tìm thấy: {len(links)}")
        return links
    else:
        print(f"Lỗi: {response.status_code} - {response.text}")

if __name__ == "__main__":
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        print("Error: FIRECRAWL_API_KEY environment variable not set")
        exit(1)
    get_total_urls_firecrawl(api_key, "https://admissions.vinuni.edu.vn")