const { Plugin } = require("powercord/entities")
const { React } = require("powercord/webpack")
const fs = require('fs')
const path = require('path')
const Settings = require('./reactcomponents/Settings')
const fileRegex = /\.((s?c|le)ss|styl)$/;

module.exports = class DevInjector extends Plugin {
  constructor() {
    super()
    // Declare class wide variable to reuse
    this.idCounter = 0
    this.idStorage = []
    this.loadedFiles = []
  }
  async startPlugin() {
    // Load Internal Styling

    this.loadStylesheet('style.css')
    // Register Settings Menu
    powercord.api.settings.registerSettings('devInjector', {
      category: this.entityID,
      label: 'Customa Dev Injector',
      render: (props) => React.createElement(Settings, { ...props, saveHandler: this.handleSave.bind(this) })
    })


    // Load Files and Folders with Default Parameters
    this.loadFiles()
    this.loadFolder()
  }

  handleSave() {
    this.unloadAll()
    this.loadFiles()
    this.loadFolder()
  }

  unloadAll() {
    const themes = [...powercord.styleManager.themes.keys()].filter(k => k.includes('Customa-Injector-File'))
    for (const theme of themes) {
      powercord.styleManager.unmount(theme, powercord.styleManager.themes.get(theme).trackedFiles[0].file)
    }
    this.idStorage = []
    this.idCounter = 0
    this.loadedFiles = []
  }

  async pluginWillUnload() {
    // Go through all the saved IDs and delete all styles associated with the plugin
    this.unloadAll()
    // Unregister Powercord Setting
    powercord.api.settings.unregisterSettings('devInjector')
  }

  async loadFiles(filenames = this.settings.get('files'), exceptions = this.settings.get('exceptions') || [], folder = '') {
    // When nothing is set in settings this field can be undefined, to not break the loop below, it will be set to an empty array
    if (!filenames) {
      // End the function as we haven't received anything of use
      return void 0
    } else {
      // To be able to use .includes later in the code, all exceptions will be formed according to the filename
      exceptions = exceptions.map((exception) => {
        return exception.value.replace(/\\/g, '/')
      })
    }

    // Loop through all the files
    filenames.filter(e => e.value).forEach(element => {
      // Gather Value from field
      let filename = element.value

      // Is "folder" not empty or does it already end with a \
      if (folder && (!folder.endsWith('\\') || !folder.endsWith('/'))) {
        filename = folder + '/' + filename
      } else {
        filename = folder + filename
      }
      // "Clean" the filename in DOS systems
      let cleanFilename = filename.replace(/\\/g, '/')

      // If File is exceptions ignore it
      if (exceptions.includes(cleanFilename)) {
        console.log('test')
        this.warn(`Excluded File: ${filename}`)
      } else if (this.loadedFiles.includes(cleanFilename)) {
        this.warn(`Duplicate File: ${filename}`)
      } else {
        // Check if "File" is really a file
        try {
          if (fs.lstatSync(filename).isFile()) {
            // Check if the file is a css file
            if (fileRegex.test(filename)) {
              // Create an ID (using the counter) and the filename (without filetype)

              filename = filename.replace(/\\/g, '/')

              let id = `${this.idCounter}-${filename.split("/").slice(-1)[0].split('.')[0]}`
              this.idCounter++

              // Push the new ID to the storage
              this.idStorage.push(id)

              // Filename added to loaded files for internal checking
              this.loadedFiles.push(filename)

              // Load File
              this.loadStylesheet(cleanFilename)
            }

          } else {
            // In case nested loading is needed, the current "file" will be sent to the folder loading again
            this.loadFolder([{ key: 0, value: filename }])
          }
        } catch (e) {
          this.error(`File not found: ${filename}`)
        }
      }
    })
  }

  loadFolder(foldernames = this.settings.get('folders'), exceptions = this.settings.get('exceptions') || []) {
    // When nothing is set in settings this field can be undefined, to not break the loop below, it will be set to an empty array
    if (!foldernames) {
      // End function because we are not actually relieving anything of meaning
      return void 0
    } else {
      // To be able to use .includes later in the code, all exceptions will be formed according to the filename
      exceptions = exceptions.map((exception) => {
        return exception.value.replace(/\\/g, '/')
      })
    }

    // Loop through all the folders
    foldernames.filter(e => e.value).forEach(element => {
      // Gather Value from field
      let foldername = element.value.replace(/\\/g, '/')

      // Ignore the folder when it is in the exceptions
      if (!exceptions.includes(foldername)) {
        try {
          // Check whether the "folder", is actually a folder
          if (!fs.lstatSync(foldername).isFile()) {

            // Read all Files into loadFiles when it is a folder, use default exceptions but give current folder as parameter so file will be found
            let fileNames = fs.readdirSync(foldername)

            // Prepare Array for call of loadFile
            let files = fileNames.map((file) => {
              return { key: 0, value: file }
            })
            this.loadFiles(files, undefined, foldername)
          } else {
            // Send one element array to file Loading when "folder" is file
            this.loadFiles({ key: 0, value: foldername })
          }
        } catch (e) {
          this.error(`Folder not found: ${foldername}`)
        }
      } else {
        this.warn(`Excluded Folder: ${foldername}`)
      }
    })
  }
}
