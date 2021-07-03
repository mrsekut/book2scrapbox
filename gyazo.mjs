import request from "request";

export function image(query = {}) {
  return new Promise((resolve, reject) => {
    query.access_token = process.env.GYAZO_TOKEN;
    const url = "https://api.gyazo.com/api/images/" + query.image_id;
    request.get(
      {
        url: url,
        qs: query,
      },
      (err, res, body) => {
        if (err) return reject(err);
        if (res.statusCode !== 200) return reject(res.body);
        resolve({
          response: res,
          data: JSON.parse(res.body),
        });
      }
    );
  });
}
