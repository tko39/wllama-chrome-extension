# Wllama chrome extension

A Chrome extension for analyzing the current page you're browsing.

## Main Functionality

The main functionality of the extension is implemented in `InPageComponent.tsx`. This component is responsible for analyzing the current page and providing insights by interacting with the user.
The entire conversation is in the browser, in such case no data is transferred to any third party by this extension. The entire conversation is in the browser.

## Models

We recommend using qwen2.5-0.5b-instruct-q4_k_m.gguf. See `public/models/sources.txt` for downloading from `huggingface.co`, the model should be put next to `sources.txt`

## Features

- Analyze the current page. One can ask questions regarding the page in a chat-completion mechanism.

## Installation

To install the extension, follow these steps:

1. Clone the repository using `git clone https://github.com/tko39/wllama-chrome-extension.git`
2. Go to the Chrome extensions page by typing `chrome://extensions/` in the address bar
3. Enable developer mode
4. Click "Load unpacked"
5. Select the folder containing the extension's built code (`dist`)

## Development

To contribute to the development of the extension, please fork the repository and submit a pull request with your changes.

## License

MIT
