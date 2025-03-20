import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const number = searchParams.get('number');
  const apiKey = searchParams.get('apiKey');

  if (!number || !apiKey) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const response = await axios.get(`https://proweblook.com/api/v1/checkwanumber`, {
      params: {
        number,
        api_key: apiKey
      }
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate number' }, { status: 500 });
  }
}