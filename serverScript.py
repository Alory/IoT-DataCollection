import paho.mqtt.client as mqtt
import numpy as np
import pandas as pd
from math import acos, atan2, cos, pi, sin
import json
import time
import os

hongkongG = 978.5
iotstd = np.array([0,-hongkongG,0])

def rotation_matrix(vector_orig, vector_fin):
    """Calculate the rotation matrix required to rotate from one vector to another.
    For the rotation of one vector to another, there are an infinit series of rotation matrices
    possible.  Due to axially symmetry, the rotation axis can be any vector lying in the symmetry
    plane between the two vectors.  Hence the axis-angle convention will be used to construct the
    matrix with the rotation axis defined as the cross product of the two vectors.  The rotation
    angle is the arccosine of the dot product of the two unit vectors.
    Given a unit vector parallel to the rotation axis, w = [x, y, z] and the rotation angle a,
    the rotation matrix R is::
              |  1 + (1-cos(a))*(x*x-1)   -z*sin(a)+(1-cos(a))*x*y   y*sin(a)+(1-cos(a))*x*z |
        R  =  |  z*sin(a)+(1-cos(a))*x*y   1 + (1-cos(a))*(y*y-1)   -x*sin(a)+(1-cos(a))*y*z |
              | -y*sin(a)+(1-cos(a))*x*z   x*sin(a)+(1-cos(a))*y*z   1 + (1-cos(a))*(z*z-1)  |
    @param R:           The 3x3 rotation matrix to update.
    @type R:            3x3 numpy array
    @param vector_orig: The unrotated vector defined in the reference frame.
    @type vector_orig:  numpy array, len 3
    @param vector_fin:  The rotated vector defined in the reference frame.
    @type vector_fin:   numpy array, len 3
    """

    # Convert the vectors to unit vectors.
    vector_orig = vector_orig / np.linalg.norm(vector_orig)
    vector_fin = vector_fin / np.linalg.norm(vector_fin)

    # The rotation axis (normalised).
    axis = np.cross(vector_orig, vector_fin)
    axis_len = np.linalg.norm(axis)
    if axis_len != 0.0:
        axis = axis / axis_len

    # Alias the axis coordinates.
    x = axis[0]
    y = axis[1]
    z = axis[2]

    # The rotation angle.
    angle = acos(np.dot(vector_orig, vector_fin))

    # Trig functions (only need to do this maths once!).
    ca = cos(angle)
    sa = sin(angle)

    R = np.zeros((3, 3))
    # Calculate the rotation matrix elements.
    R[0, 0] = 1.0 + (1.0 - ca) * (x ** 2 - 1.0)
    R[0, 1] = -z * sa + (1.0 - ca) * x * y
    R[0, 2] = y * sa + (1.0 - ca) * x * z
    R[1, 0] = z * sa + (1.0 - ca) * x * y
    R[1, 1] = 1.0 + (1.0 - ca) * (y ** 2 - 1.0)
    R[1, 2] = -x * sa + (1.0 - ca) * y * z
    R[2, 0] = -y * sa + (1.0 - ca) * x * z
    R[2, 1] = x * sa + (1.0 - ca) * y * z
    R[2, 2] = 1.0 + (1.0 - ca) * (z ** 2 - 1.0)

    return R

addr2pos = {"90BDB8B2-4737-1EB3-8AC7-756943596524": "LL", "7DFEC5A2-697F-482F-C6A8-9A0450ECC674": "LM", \
            "9DBD3CB0-12E9-D9F8-823A-EEAEA7A840D1": "RL", "8D6C8805-B13E-9F56-5B88-1DC63407869F": "RM", \
            "ADF9BB24-6649-8CC1-AF67-8AACB4F146EC": "RM", "92F37785-2E73-2E79-0F6F-856BDEC44D29":"RL"}

# process static data to dataframe
def staticPayloadProc(payload):
    strPayload = str(payload)
    staticData = strPayload.split('\n')
    dataCols = dict(LLACx=[], LLACy=[], LLACz=[], LLGYx=[], LLGYy=[], LLGYz=[],
                    RLACx=[], RLACy=[], RLACz=[], RLGYx=[], RLGYy=[], RLGYz=[])
    for line in staticData:
        tempData = json.loads(line)
        index = 1000 if (tempData['sensor'] == 'accelerometer') else 1
        x = float(tempData['value']['x']) * index
        y = float(tempData['value']['y']) * index
        z = float(tempData['value']['z']) * index
        pos = addr2pos[tempData['address']]

        sensor = 'AC' if (index == 1000) else 'GY'
        dataCols[pos + sensor + 'x'].append(x)
        dataCols[pos + sensor + 'y'].append(y)
        dataCols[pos + sensor + 'z'].append(z)

    values = dataCols.values()
    colNum = min(list(map(lambda x: len(x), values)))
    for col in dataCols:
        dataCols[col] = dataCols[col][0:colNum]

    staticData = pd.DataFrame(dataCols)
    return staticData

# get rotate matrix and gyroscope's zero-drift from static data
def getCaliData(staticData, stdg):
    # staticData = staticData[iotCols]
    staticData.loc['std'] = staticData.apply(lambda x: x.mean())
    caliData = staticData.iloc[-1:]

    acAxis = {'llac': ['LLACx', 'LLACy', 'LLACz'],
              'rlac': ['RLACx', 'RLACy', 'RLACz']}
    rotMat = {}
    for axis in acAxis:
        data = caliData[acAxis[axis]]
        data = (np.array(data))[0]
        # print(data,std)
        R = rotation_matrix(data, stdg)
        index = np.linalg.norm(stdg) / np.linalg.norm(data)
        rotMat[axis] = [R, index]

    return caliData, rotMat

def gyroCali(zeroOffset,data):
    cols = list(data.columns)
    acCols = list(filter(lambda x: 'AC' in x, cols))

    usa0drift = zeroOffset[cols]
    cali = usa0drift.iloc[0, :]
    cali[acCols] = 0.0
    data = data.sub(cali)

    return data

def on_connect(client, userdata, flags, rc):
    print("rc: " + str(rc))
    client.subscribe("staticData",0)
    client.subscribe("recordFlag", 0)
    client.subscribe("data", 0)

caliData = None
rotMat = None

def on_message(client, obj, msg):
    global caliData,rotMat
    topic = msg.topic
    print("topic : " + msg.topic)
    if(topic == "staticData"):  # process static data
        staticData = staticPayloadProc(msg.payload)
        caliData, rotMat = getCaliData(staticData, iotstd)
    if(topic == "trialdata"):

def on_subscribe(client, obj, mid, granted_qos):
    print("Subscribed: " + str(obj) + " " + str(granted_qos));

mqttc = mqtt.Client(transport="websockets");
mqttc.on_connect = on_connect;
mqttc.on_message = on_message
mqttc.on_subscribe = on_subscribe
mqttc.connect("ec2-18-217-114-173.us-east-2.compute.amazonaws.com",1883,60);
# rc=0;
# while rc == 0:
#     rc = mqttc.loop()
# print("rc: " + str(rc))
mqttc.loop_forever()