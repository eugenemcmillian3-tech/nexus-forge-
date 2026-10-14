FROM mcr.microsoft.com/playwright:v1.64.0-noble
WORKDIR /runner
RUN npm install --no-audit --no-fund --ignore-scripts playwright@1.64.0
COPY run.mjs /runner/run.mjs
USER pwuser
ENTRYPOINT ["node", "/runner/run.mjs"]
