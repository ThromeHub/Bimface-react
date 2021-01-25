import React from 'react';
import GlobalContext from '@src/common/global-context';
import styles from './bimface.module.less';
import { RootDispatch, RootState } from '@src/store';
import { connect } from '@store/connect';
import * as utils from "@src/utils";

//antd
import { Button, DatePicker, Drawer, Form } from 'antd';
import { MenuUnfoldOutlined, BankOutlined, EnvironmentOutlined } from '@ant-design/icons';


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
export default class BimfaceMap extends React.Component<any> {
  static contextType = GlobalContext;
  constructor(props, context) {
    super(props, context);
    this.state = {
      drawerShow: false,
      isolate: "",
      iszoom: false,
      app: "",
      viewer: "",
      viewToken: "886c94323c484b27bed9b9cc1e82933b",
      construct: ["地坪", "F1", "F2", "F3", "ROOF"],
    }
  }

  componentDidMount() {
    console.log("utils", utils)
    this.initeBimface();
  }

  initeBimface(viewToken = this.state.viewToken) {
    // 根据viewToken指定待显示的模型或图纸
    let loaderConfig = new BimfaceSDKLoaderConfig();
    loaderConfig.viewToken = viewToken;
    // 加载BIMFACE JSSDK加载器
    BimfaceSDKLoader.load(loaderConfig, viewMetaData => {
      //创建 WebApplication3DConfig配置项
      let webAppConfig = new Glodon.Bimface.Application.WebApplication3DConfig();
      webAppConfig.domElement = document.getElementById('domId');
      //创建 WebApplication3D加载模型
      let app = new Glodon.Bimface.Application.WebApplication3D(webAppConfig);
      app.addView(viewToken);
      //获取viewer3D对象
      let viewer = app.getViewer();
      this.setState({
        app, viewer
      })
    }, e => console.log("failure_load:", e));
  }

  // 解构
  isolate(levelName) {
    let { viewer } = this.state;
    // 重置判断
    if (this.state.isolate == levelName) {
      this.setState({ isolate: "" })
      viewer.clearIsolation();
      viewer.render();
      return
    }
    // 设置隔离选项，指定其他构件为半透明状态
    let makeOthersTranslucent = Glodon.Bimface.Viewer.IsolateOption.MakeOthersTranslucent;
    // 调用viewer3D.method，隔离楼层为"F2"的构件
    viewer.isolateComponentsByObjectData([{ levelName }], makeOthersTranslucent);
    // 更新
    viewer.render();
    this.setState({ isolate: levelName })
  }

  // 定位
  zoomTo() {
    let { viewer } = this.state;
    if (this.state.iszoom) {
      this.setState({ iszoom: false })
      viewer.setView(Glodon.Bimface.Viewer.ViewOption.Home);
      return
    }
    viewer.addSelectedComponentsById(['271431']);
    viewer.zoomToSelectedComponents();
    viewer.clearSelectedComponents();
    this.setState({ iszoom: true })
  }

  render() {
    return (
      <div id="Bimface" className={styles.Bimface}>
        {/* 展示项 */}
        <div className={styles.factor}>
          <DatePicker size="small" />
          <Button type="primary"
            size="small"
            onClick={_ => this.setState({ drawerShow: true })}>
            <MenuUnfoldOutlined />
          </Button>
        </div>
        {/* 主图 */}
        <main id="domId" className={styles.container}></main>
        {/* 配置项 */}
        <aside className={styles.config}>
          <Drawer title="Bimface Config!"
            placement="right"
            closable={false}
            getContainer={false}
            visible={this.state.drawerShow}
            style={{ position: 'absolute' }}
            onClose={_ => this.setState({ drawerShow: false })}
          >
            <Form initialValues={{ remember: true }}>
              {/* 结构 */}
              <Form.Item label="解构">
                {this.state.construct.map((item, index) => {
                  return (
                    <Button type="dash" size="small" key={index} onClick={this.isolate.bind(this, item)}>
                      <span>{item}</span>
                      <BankOutlined />
                    </Button>
                  )
                })}
              </Form.Item>
              {/* 定位 */}
              <Form.Item label="定位">
                <Button type="dash" size="small" onClick={this.zoomTo.bind(this)}>
                  <span>正门</span>
                  <EnvironmentOutlined />
                </Button>
              </Form.Item>
            </Form>
          </Drawer>
        </aside>
      </div>
    )
  }
}