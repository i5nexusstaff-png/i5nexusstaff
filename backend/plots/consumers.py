import json
from channels.generic.websocket import AsyncWebsocketConsumer


class PlotStatusConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time plot status updates.
    Clients join a group named  project_<id>  and receive
    broadcast messages whenever a plot's status changes.
    """

    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.group_name = f'project_{self.project_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # Handler called when a message is sent to the group
    async def plot_status_update(self, event):
        await self.send(text_data=json.dumps(event['data']))
