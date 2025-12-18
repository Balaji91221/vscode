import * as vscode from 'vscode';
import * as https from 'https';

/**
 * Non-streaming simple OpenAI Chat Completion request.
 */
export async function openAIChatInference(
  prompt: string,
  output: vscode.OutputChannel,
  token: vscode.CancellationToken
): Promise<string> {
  const cfg = vscode.workspace.getConfiguration('aiAssistant.openAI');
  const apiKey = cfg.get<string>('apiKey') || '';
  const model = cfg.get<string>('model') || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OpenAI API key not set. Configure "aiAssistant.openAI.apiKey" in settings.');
  }

  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1024
  });

  const options: https.RequestOptions = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      Authorization: `Bearer ${apiKey}`
    }
  };

  return new Promise<string>((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if ((parsed as any).error) {
            const errMsg = (parsed as any).error?.message || 'OpenAI API error';
            return reject(new Error(errMsg));
          }

          const text = parsed.choices && parsed.choices[0] && parsed.choices[0].message ? parsed.choices[0].message.content : '';
          resolve(text);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', err => reject(err));

    if (token && token.isCancellationRequested) {
      req.destroy();
      return reject(new Error('Request cancelled'));
    }

    req.write(body);
    req.end();
  });
}

/**
 * Streaming OpenAI Chat inference using Server-Sent Events (SSE) from the Chat Completions API (stream: true)
 * Streams token fragments to the provided output channel in real time.
 */
export async function openAIChatStream(
  prompt: string,
  output: vscode.OutputChannel,
  token: vscode.CancellationToken,
  onChunk?: (chunk: string) => void
): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('aiAssistant.openAI');
  const apiKey = cfg.get<string>('apiKey') || '';
  const model = cfg.get<string>('model') || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('OpenAI API key not set. Configure "aiAssistant.openAI.apiKey" in settings.');
  }

  const body = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    stream: true
  });

  const options: https.RequestOptions = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      Authorization: `Bearer ${apiKey}`
    }
  };

  await new Promise<void>((resolve, reject) => {
    const req = https.request(options, res => {
      res.setEncoding('utf8');

      let buffer = '';

      res.on('data', chunk => {
        buffer += chunk;

        // OpenAI server-sent events come as lines starting with 'data: '
        let lines = buffer.split('\n');
        // Keep last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) { continue; }
          const data = line.replace(/^data: /, '').trim();
          if (data === '[DONE]') {
            resolve();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const choices = (parsed as any).choices || [];
            if (choices.length > 0) {
              const delta = choices[0].delta || {};
              const content = delta.content || '';
              if (content) {
                output.append(content);
                if (onChunk) { onChunk(content); }
              }
            }
          } catch (err) {
            // ignore parse errors for non-JSON lines
          }
        }
      });

      res.on('end', () => resolve());
    });

    req.on('error', err => reject(err));

    if (token && token.isCancellationRequested) {
      req.destroy();
      return reject(new Error('Request cancelled'));
    }

    req.write(body);
    req.end();
  });
}
