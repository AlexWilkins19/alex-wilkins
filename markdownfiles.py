import json
import os

json_file = "data/articles.json"

with open(json_file, "r") as f:
    data = json.load(f)

articles = data["articles"]

output_dir = "content/portfolio"
external_urls = {}

for i, article in enumerate(articles):
    file_name = f"article{i + 1}.md"
    output_path = os.path.join(output_dir, file_name)

    with open(output_path, "w") as f:
        f.write("---\n")
        f.write(f'title: "{article["title"]}"\n')
        f.write(f'imageUrl: "{article["imageUrl"]}"\n')
        f.write(f'index: {i + 1}\n')
        f.write(f'weight: {i + 1}\n')
        f.write("---\n")

    external_urls[f"article{i + 1}"] = article["url"]

with open("data/external_urls.json", "w") as f:
    json.dump(external_urls, f, indent=2)
