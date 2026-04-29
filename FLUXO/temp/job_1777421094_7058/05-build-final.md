# Step 05 Builder Final

- site_path: C:\Users\user\Desktop\simple-ai\api\sites\job_1777421094_7058\index.html
- status: done

# Usage

```json
{
  "input_tokens": 19716,
  "output_tokens": 6539,
  "builder_model": "cx/gpt-5.5",
  "builder_provider": "openai-compatible",
  "html_qa": {
    "passed": true,
    "repairs_applied": 0,
    "images_total": 3,
    "images_local": 3,
    "images_broken": 0,
    "external_images_replaced": 0,
    "cta_status": "ok",
    "warnings": []
  },
  "site_score": {
    "score": 9300,
    "max_score": 10000,
    "dimensions": {
      "html_structure": 1000,
      "responsive_css": 1000,
      "non_generic_content": 850,
      "valid_cta_links": 900,
      "images": 900,
      "required_sections": 800,
      "typography": 1000,
      "colors_branding": 1000,
      "accessibility": 1000,
      "polish": 850
    },
    "issues": {
      "required_sections": [
        "sem secao de servicos/produtos"
      ]
    },
    "passed_8500": true
  }
}
```