import React from 'react';
import GlobalContext from '@src/common/global-context';
import styles from './cesium.module.less';
import { RootDispatch, RootState } from '@src/store';
import { connect } from '@store/connect';

import * as Cesium from 'cesium/Cesium';



function mapStateToProps(state: RootState) {
  const {
    login: { count },
  } = state;
  return { count };
}

function mapDispatchToProps(dispatch: RootDispatch) {
  const { login } = dispatch;
  return {
    increment: login.INCREMENT,
    decrement: login.decrement,
  };
}

@connect(mapStateToProps, mapDispatchToProps)
export default class CesiumMap extends React.Component<any> {
  static contextType = GlobalContext;
  constructor(props, context) {
    super(props, context);
    this.state = {
      viewer: "", // cesium
      baseLayer: "",// 底图
      htmlLayer: "",// html图层
      heatLayer: "",// 热力图图层
    }
  }

  // 地图初始化
  initMap() {
    // 指向中国
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(118, 27, 123, 31);
    Cesium.Camera.DEFAULT_VIEW_FACTOR = 1.0;
    let viewer = new Cesium.Viewer('mapContainer', {
      // animation: false,
      fullscreenButton: false,
      vrButton: false,
      // geocoder: false,       // 搜索
      // homeButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      // timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      shouldAnimate: true,
      imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
        url:"http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer"
        // url:"http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer"
      }),
      // imageryProvider: new Cesium.createWorldImagery({
      //   style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
      //   // style: Cesium.IonWorldImageryStyle.ROAD,
      // }),
      // terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      terrainProvider: new Cesium.createWorldTerrain({
        requestWaterMask: true,                        // 水流效果
        requestVertexNormals: true                     // 光照效果
      }),
      scene3DOnly: false,
      baseLayerPicker: false,
    })
    // 光线正确遮挡
    viewer.scene.globe.depthTestAgainstTerrain = true;
    // viewer.scene.globe.enableLighting = true;
    // 分辨率调整
    viewer._cesiumWidget._supportsImageRenderingPixelated = Cesium.FeatureDetection.supportsImageRenderingPixelated();
    viewer._cesiumWidget._forceResize = true;
    // 去掉默认logo
    viewer._cesiumWidget._creditContainer.style.display = 'none';
    // 功能配置
    this.setState({ viewer }, () => {
      this.setCamera(); //相机
      this.setPoint();  //点
      // this.setDomain(); //区域
      this.setModel();   //模型
      this.setEvent();  //事件
    });
  }
  setPoint() {
    this.state.viewer.entities.add({
      name: "tokyo",
      description: "test",
      position: Cesium.Cartesian3.fromDegrees(139.767052, 35.681167, 100),
      point: { pixelSize: 10 }
    });
  }
  // 架设摄像
  setCamera(destination = new Cesium.Cartesian3(1335946,-4656547,4137239), headPitchRoll = new Cesium.HeadingPitchRoll.fromDegrees(7.1077496389876024807, -31.987223091598949054, 0.025883251314954971306)) {
    // 曼哈顿 destination = new Cesium.Cartesian3.fromDegrees(-73.998114468289017509, 40.674512895646692812, 2631.082799425431), headPitchRoll = new Cesium.HeadingPitchRoll.fromDegrees(7.1077496389876024807, -31.987223091598949054, 0.025883251314954971306)
    // 中国 destination = new Cesium.Cartesian3(-2178109, 4389608, 4072009), headPitchRoll = new Cesium.Cartesian3(7.1077496389876024807, -31.987223091598949054, 0.025883251314954971306)
    let { heading, pitch, roll } = headPitchRoll;
    this.state.viewer.camera.setView({
      duration: 2.0,
      maximumHeight: 2000,
      pitchAdjustHeight: 2000,
      endTransform: Cesium.Matrix4.IDENTITY,
      destination,
      orientation: { heading, pitch, roll }
    })
  }
  setDomain() {
    let neighborhoods, that = this;
    Cesium.GeoJsonDataSource.load('static/SampleData/sampleNeighborhoods.geojson', { clampToGround: true })
      .then(function (dataSource) {
        // Add the new data as entities to the viewer
        that.state.viewer.dataSources.add(dataSource);
        neighborhoods = dataSource.entities;

        // Get the array of entities
        var neighborhoodEntities = dataSource.entities.values;
        // console.log("neighborhoodEntities",neighborhoodEntities)
        for (var i = 0; i < neighborhoodEntities.length; i++) {
          var entity = neighborhoodEntities[i];

          if (Cesium.defined(entity.polygon)) {
            // Use kml neighborhood value as entity name
            entity.name = entity.properties.neighborhood;
            // Set the polygon material to a random, translucent color
            entity.polygon.material = Cesium.Color.fromRandom({
              red: 0.1,
              maximumGreen: 0.5,
              minimumBlue: 0.5,
              alpha: 0.6
            });
            // Tells the polygon to color the terrain. ClassificationType.CESIUM_3D_TILE will color the 3D tileset, and ClassificationType.BOTH will color both the 3d tiles and terrain (BOTH is the default)
            entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
            // Generate Polygon center
            var polyPositions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
            var polyCenter = Cesium.BoundingSphere.fromPoints(polyPositions).center;
            polyCenter = Cesium.Ellipsoid.WGS84.scaleToGeodeticSurface(polyCenter);
            entity.position = polyCenter;
            // Generate labels
            entity.label = {
              text: entity.name,
              showBackground: true,
              scale: 0.6,
              height: 200.0,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(10.0, 8000.0),
              disableDepthTestDistance: 100.0
            };
          }
        }
      });
  }

  // 设置模型
  setModel() {
    var city = this.state.viewer.scene.primitives.add(new Cesium.Cesium3DTileset({ url: Cesium.IonResource.fromAssetId(3839) }));
    var heightOffset = -32;
    city.readyPromise.then(function (tileset) {
      // Position tileset
      var boundingSphere = tileset.boundingSphere;
      var cartographic = Cesium.Cartographic.fromCartesian(boundingSphere.center);
      var surfacePosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0.0);
      var offsetPosition = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, heightOffset);
      var translation = Cesium.Cartesian3.subtract(offsetPosition, surfacePosition, new Cesium.Cartesian3());
      tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
    });
    var heightStyle = new Cesium.Cesium3DTileStyle({
      color: {
        conditions: [
          ["${height} >= 300", "rgba(45, 0, 75, 0.5)"],
          ["${height} >= 200", "rgb(102, 71, 151)"],
          ["${height} >= 100", "rgb(170, 162, 204)"],
          ["${height} >= 50", "rgb(224, 226, 238)"],
          ["${height} >= 25", "rgb(252, 230, 200)"],
          ["${height} >= 10", "rgb(248, 176, 87)"],
          ["${height} >= 5", "rgb(198, 106, 11)"],
          ["true", "rgb(127, 59, 8)"]
        ]
      }
    });
    city.style = heightStyle;
  }

  // 事件
  setEvent() {
    let handler = new Cesium.ScreenSpaceEventHandler(this.state.viewer.canvas);
    // 鼠标双击获取当前
    handler.setInputAction((e) => {
      //将笛卡尔坐标转化为经纬度坐标
      console.log(this.state.viewer.camera);
      let position = this.state.viewer.scene.pickPosition(e.position);
      let cartographic = Cesium.Cartographic.fromCartesian(position);
      let longitude = Cesium.Math.toDegrees(cartographic.longitude);
      let latitude = Cesium.Math.toDegrees(cartographic.latitude);
      let height = cartographic.height;
      console.log(longitude, latitude, height);
      // this.setCamera(
      //   Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
      // );
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  componentDidMount() {
    console.log("Cesium", Cesium)
    this.initMap();
  }

  render() {
    const { count } = this.props;
    return (
      <div className={styles.cesium}>
        <main id="mapContainer" className={styles.mapContainer} />
      </div>
    );
  }
}
