import { stitch } from '@google/stitch-sdk';

const [, , projectId, screenId] = process.argv;
if (!projectId || !screenId) {
  console.error('Usage: node fetch-stitch-screen.mjs <projectId> <screenId>');
  process.exit(1);
}

const project = stitch.project(projectId);
const screen = await project.getScreen(screenId);
console.log(
  JSON.stringify(
    {
      imageUrl: await screen.getImage(),
      htmlUrl: await screen.getHtml(),
      title: screen.data?.title,
      width: screen.data?.width,
      height: screen.data?.height,
      deviceType: screen.data?.deviceType,
    },
    null,
    2,
  ),
);
