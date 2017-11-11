import { Handler, Context, Callback } from 'aws-lambda';

interface HelloResponse {
  statusCode: number;
  body: string;
}

const hello = (event: any, context: Context, callback: Callback) => {
  const response: HelloResponse = {
    statusCode: 200,
    body: JSON.stringify({
      message: Math.floor(Math.random() * 1000),
      event
    })
  };

  callback(undefined, response);
};

export { hello }