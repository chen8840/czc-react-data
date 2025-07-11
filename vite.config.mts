import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/lib/main.ts', // 库入口文件
      name: 'CzcReactData',        // UMD 格式全局变量名
      fileName: (format) => `czc-react-data.${format}.js` // 输出文件名
    },
    rollupOptions: {
      external: [], // 需排除的外部依赖
      output: {
        globals: {} // 配置 UMD 格式的全局变量
      }
    }
  },
  plugins: [
    dts(), // 自动生成声明文件
    viteStaticCopy({
      targets: [
        {
          src: 'package.json', // 需复制的文件路径（相对于项目根目录）
          dest: '.'            // 目标路径（相对于 dist 目录）
        }
      ]
    })
  ]
});
