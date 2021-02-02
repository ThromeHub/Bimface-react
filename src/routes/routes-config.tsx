// main
import React from 'react';
import App from '@src/entry/App';
// list
import Cesium from '@src/components/cesium/Cesium'
import Bimface from '@src/components/bimface/Bimface'
import BimfaceGis from '@src/components/bimface/BimfaceGis'

// 路由结构
export interface RouteConfigDeclaration {
    path: string; //当前路由路径
    name?: string; //当前路由名称
    exact?: boolean; //是否严格匹配路由
    isProtected?: boolean; //是否需要路由鉴权
    isRedirect?: boolean; //是否需要路由重定向
    isDynamic?: boolean; //是否需要动态加载路由
    loadingFallback?: string; //动态加载路由时的提示文案
    component: any; //路由组件
    routes?: RouteConfigDeclaration[]; //子路由
}

export const routesConfig: RouteConfigDeclaration[] = [
    {
        path: '/',
        name: 'root-route',
        component: App,
        routes: [
            {
                path: '/bimface',
                isDynamic: true,
                component: Bimface
            },
            {
                path: '/bimfaceGis',
                isDynamic: true,
                component: BimfaceGis
            },
            {
                path: '/cesium',
                // exact: true,
                isDynamic: true,
                component: Cesium,
            }
        ],
    },
];
